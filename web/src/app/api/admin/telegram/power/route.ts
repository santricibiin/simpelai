import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { requireAdmin } from "@/lib/reseller";
import { getAppSetting, setAppSetting } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

const LOG = "/var/log/telegram-bot.log";

type BotConfig = {
  token: string;
  pid?: number | null;
  [k: string]: unknown;
};

function pidAlive(pid: number | null | undefined): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body harus JSON" }, { status: 400 });
  }

  const action = (body as { action?: unknown })?.action;
  if (action !== "start" && action !== "stop") {
    return NextResponse.json({ error: "action harus start atau stop" }, { status: 400 });
  }

  const cfg = await getAppSetting<Partial<BotConfig>>("telegram", {});

  if (action === "stop") {
    if (pidAlive(cfg.pid)) {
      try {
        process.kill(cfg.pid!, "SIGTERM");
      } catch {}
    }
    await setAppSetting("telegram", { ...cfg, pid: null });
    return NextResponse.json({ ok: true, running: false });
  }

  // start
  if (!cfg.token) return NextResponse.json({ error: "Token bot belum diisi." }, { status: 400 });
  if (pidAlive(cfg.pid)) return NextResponse.json({ ok: true, running: true, note: "bot sudah jalan" });

  let out: ReturnType<typeof createWriteStream> | null = null;
  try {
    out = createWriteStream(LOG, { flags: "a" });
  } catch {
    out = null;
  }

  const child = spawn("node", ["scripts/telegram-bot.mjs"], {
    cwd: process.cwd(),
    detached: true,
    stdio: ["ignore", out ? "pipe" : "ignore", out ? "pipe" : "ignore"],
  });

  if (out) {
    child.stdout?.pipe(out);
    child.stderr?.pipe(out);
  }
  child.unref();

  await setAppSetting("telegram", { ...cfg, pid: child.pid });
  return NextResponse.json({ ok: true, running: true, pid: child.pid });
}
