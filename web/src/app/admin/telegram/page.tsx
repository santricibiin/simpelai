import type { Metadata } from "next";
import TelegramBotSettings from "@/components/admin/TelegramBotSettings";
import { getAppSetting } from "@/lib/app-settings";

export const metadata: Metadata = { title: "Telegram Bot" };
export const dynamic = "force-dynamic";

type BotConfig = {
  token: string;
  adminId: string;
  forceJoinOn: boolean;
  forceJoinLink: string;
  forceJoinChatId: string;
  notifyChannelId: string;
  pid?: number | null;
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

export default async function TelegramPage() {
  const cfg = await getAppSetting<Partial<BotConfig>>("telegram", {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Telegram Bot</h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Bot jualan Telegram 3rd party — produk dari katalog Anda, pembayaran QRIS dari sistem ini.
        </p>
      </div>

      <TelegramBotSettings
        initial={{
          token: cfg.token ? `${cfg.token.slice(0, 8)}…${cfg.token.slice(-4)}` : "",
          adminId: cfg.adminId ?? "",
          forceJoinOn: Boolean(cfg.forceJoinOn),
          forceJoinLink: cfg.forceJoinLink ?? "",
          forceJoinChatId: cfg.forceJoinChatId ?? "",
          notifyChannelId: cfg.notifyChannelId ?? "",
        }}
        initialRunning={pidAlive(cfg.pid)}
      />
    </div>
  );
}
