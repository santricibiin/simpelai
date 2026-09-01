import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/reseller";
import { getAppSetting, setAppSetting } from "@/lib/app-settings";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const dynamic = "force-dynamic";

const run = promisify(execFile);

export type BotConfig = {
  token: string;
  adminId: string;
  forceJoinOn: boolean;
  forceJoinLink: string;
  forceJoinChatId: string;
  notifyChannelId: string;
  pid?: number | null;
};

const DEFAULTS: BotConfig = {
  token: "",
  adminId: "",
  forceJoinOn: false,
  forceJoinLink: "",
  forceJoinChatId: "",
  notifyChannelId: "",
};

async function getBotConfig(): Promise<BotConfig> {
  const raw = await getAppSetting<Partial<BotConfig>>("telegram", {});
  return {
    token: typeof raw.token === "string" ? raw.token : "",
    adminId: typeof raw.adminId === "string" ? raw.adminId : "",
    forceJoinOn: Boolean(raw.forceJoinOn),
    forceJoinLink: typeof raw.forceJoinLink === "string" ? raw.forceJoinLink : "",
    forceJoinChatId: typeof raw.forceJoinChatId === "string" ? raw.forceJoinChatId : "",
    notifyChannelId: typeof raw.notifyChannelId === "string" ? raw.notifyChannelId : "",
    pid: typeof raw.pid === "number" ? raw.pid : null,
  };
}

async function pidAlive(pid: number | null | undefined): Promise<boolean> {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const cfg = await getBotConfig();
  return NextResponse.json({
    config: {
      ...cfg,
      token: cfg.token ? `${cfg.token.slice(0, 8)}…${cfg.token.slice(-4)}` : "",
      hasToken: Boolean(cfg.token),
    },
    running: await pidAlive(cfg.pid),
  });
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

  const { token, adminId, forceJoinOn, forceJoinLink, forceJoinChatId, notifyChannelId } = (body ?? {}) as Record<string, unknown>;

  const cfg = await getBotConfig();
  const next: BotConfig = { ...cfg };

  if (typeof token === "string" && token.trim() && !token.includes("…")) {
    const t = token.trim();
    if (!/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(t)) {
      return NextResponse.json({ error: "Format token bot tidak valid (harus <bot_id>:<hash> dari @BotFather)." }, { status: 400 });
    }
    next.token = t;
  }
  if (typeof adminId === "string") next.adminId = adminId.trim().replace(/\D/g, "");
  if (typeof forceJoinOn === "boolean") next.forceJoinOn = forceJoinOn;
  if (typeof forceJoinLink === "string") next.forceJoinLink = forceJoinLink.trim();
  if (typeof forceJoinChatId === "string") next.forceJoinChatId = forceJoinChatId.trim().replace(/\s/g, "");
  if (typeof notifyChannelId === "string") next.notifyChannelId = notifyChannelId.trim().replace(/\s/g, "");

  if (next.forceJoinOn && !next.forceJoinChatId) {
    return NextResponse.json({ error: "Chat ID channel wajib diisi bila force join aktif." }, { status: 400 });
  }

  next.pid = cfg.pid ?? null;
  await setAppSetting("telegram", next);
  void run;
  return NextResponse.json({ ok: true });
}
