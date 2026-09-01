import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import { Resolver } from "node:dns/promises";
import path from "node:path";

const run = promisify(execFile);


const VPS_IP = process.env.VPS_PUBLIC_IP ?? "172.235.251.230";
const MANAGED_TAG = "# managed-by: simpelai-bandel";
const NGINX_AVAILABLE = "/etc/nginx/sites-available";
const NGINX_ENABLED = "/etc/nginx/sites-enabled";

export const DEFAULT_BANDEL_DOMAIN = "ai.buatprem.biz.id";

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

export async function getBandelDomain(): Promise<string> {
  const { getAppSetting } = await import("./app-settings");
  const raw = await getAppSetting<{ domain?: unknown }>("bandel-domain", {});
  return typeof raw.domain === "string" && raw.domain ? raw.domain : DEFAULT_BANDEL_DOMAIN;
}

async function saveBandelDomain(domain: string): Promise<void> {
  const { setAppSetting } = await import("./app-settings");
  await setAppSetting("bandel-domain", { domain });
}

function httpConf(domain: string): string {
  return `${MANAGED_TAG}
server {
    listen 80;
    listen [::]:80;
    server_name ${domain};

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
`;
}

function sslConf(domain: string): string {
  return `${MANAGED_TAG}
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${domain};

    ssl_certificate     /etc/letsencrypt/live/${domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;

    client_max_body_size 25m;

    location /v1/models {
        proxy_pass https://bandelbanget.xyz/v1/models;
        proxy_set_header Host bandelbanget.xyz;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE / streaming chat completions
    location /v1/chat/completions {
        proxy_pass https://bandelbanget.xyz/v1/chat/completions;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host bandelbanget.xyz;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        chunked_transfer_encoding on;
    }

    location / {
        proxy_pass https://bandelbanget.xyz;
        proxy_http_version 1.1;
        proxy_set_header Host bandelbanget.xyz;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
`;
}

async function symlink(src: string, dest: string): Promise<void> {
  try {
    await fs.unlink(dest);
  } catch {
    /* belum ada */
  }
  await fs.symlink(src, dest);
}

async function removeSite(domain: string): Promise<void> {
  for (const [file, link] of [
    [`${NGINX_AVAILABLE}/${domain}`, `${NGINX_ENABLED}/${domain}`],
    [`${NGINX_AVAILABLE}/${domain}.ssl`, `${NGINX_ENABLED}/${domain}.ssl`],
  ] as const) {
    try {
      await fs.unlink(link);
    } catch {
    /* belum ada */
    }
    try {
      await fs.unlink(file);
    } catch {
    /* belum ada */
    }
  }
}

async function nginxReload(): Promise<void> {
  await run("nginx", ["-t"]);
  await run("systemctl", ["reload", "nginx"]);
}

export type DomainResult = { ok: true; domain: string; changed: boolean } | { ok: false; error: string };

export async function setBandelDomain(rawDomain: string): Promise<DomainResult> {
  const domain = rawDomain.trim().toLowerCase();

  if (!DOMAIN_RE.test(domain) || domain.length > 253) {
    return { ok: false, error: "Format domain tidak valid." };
  }
  if (domain === "buatprem.biz.id" || domain.endsWith(".buatprem.biz.id") === false && domain === "buatprem.biz.id") {
    return { ok: false, error: "Domain utama tidak boleh dipakai." };
  }

  const current = await getBandelDomain();
  if (domain === current) {
    return { ok: true, domain, changed: false };
  }

  // tolak kalau domain punya konfig nginx yang bukan milik fitur ini
  for (const f of [`${NGINX_AVAILABLE}/${domain}`, `${NGINX_AVAILABLE}/${domain}.ssl`]) {
    try {
      const content = await fs.readFile(f, "utf8");
      if (!content.startsWith(MANAGED_TAG)) {
        return { ok: false, error: `Domain ${domain} sudah punya konfigurasi nginx lain — ditolak demi keamanan.` };
      }
    } catch {
      /* belum ada — aman */
    }
  }

  // DNS harus mengarah ke VPS ini dulu
  let ips: string[] = [];
  try {
    ips = await new Resolver().resolve4(domain);
  } catch {
    return { ok: false, error: `DNS ${domain} tidak ditemukan — pointing A record ke ${VPS_IP} dulu.` };
  }
  if (!ips.includes(VPS_IP)) {
    return { ok: false, error: `${domain} mengarah ke ${ips.join(", ")} — harus di-pointing ke ${VPS_IP} dulu.` };
  }

  // 1. pasang konfig HTTP untuk validasi certbot
  await fs.writeFile(`${NGINX_AVAILABLE}/${domain}`, httpConf(domain), { mode: 0o644 });
  await symlink(`${NGINX_AVAILABLE}/${domain}`, `${NGINX_ENABLED}/${domain}`);
  try {
    await nginxReload();
  } catch (e) {
    await removeSite(domain);
    return { ok: false, error: `nginx menolak konfigurasi: ${e instanceof Error ? e.message : "unknown"}` };
  }

  // 2. pasang SSL
  try {
    await run("certbot", [
      "certonly",
      "--webroot",
      "-w",
      "/var/www/html",
      "-d",
      domain,
      "--non-interactive",
      "--agree-tos",
      "--register-unsafely-without-email",
    ]);
  } catch (e) {
    await removeSite(domain);
    await nginxReload().catch(() => {});
    const msg = e instanceof Error ? e.message.slice(0, 300) : "unknown";
    return { ok: false, error: `Gagal menerbitkan SSL (Let's Encrypt): ${msg}` };
  }

  // 3. pasang konfig HTTPS + bersihkan domain lama
  await fs.writeFile(`${NGINX_AVAILABLE}/${domain}.ssl`, sslConf(domain), { mode: 0o644 });
  await symlink(`${NGINX_AVAILABLE}/${domain}.ssl`, `${NGINX_ENABLED}/${domain}.ssl`);
  await removeSite(current);
  try {
    await nginxReload();
  } catch (e) {
    // coba pulihkan domain lama
    await fs.writeFile(`${NGINX_AVAILABLE}/${current}`, httpConf(current), { mode: 0o644 });
    await symlink(`${NGINX_AVAILABLE}/${current}`, `${NGINX_ENABLED}/${current}`);
    await symlink(`${NGINX_AVAILABLE}/${current}.ssl`, `${NGINX_ENABLED}/${current}.ssl`);
    await nginxReload().catch(() => {});
    return { ok: false, error: `Konfigurasi SSL gagal dimuat: ${e instanceof Error ? e.message : "unknown"}` };
  }

  await saveBandelDomain(domain);
  return { ok: true, domain, changed: true };
}
