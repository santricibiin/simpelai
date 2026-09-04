import type { Metadata } from "next";
import { ChartPanel } from "@/components/admin/Panels";
import ResellerKeyForm from "@/components/admin/ResellerKeyForm";
import SiteSettingsForm from "@/components/admin/SiteSettingsForm";
import { getSettings } from "@/lib/session";
import { getResellerKey, maskKey } from "@/lib/reseller";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, keyInfo] = await Promise.all([getSettings(), getResellerKey()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Konfigurasi website dan integrasi reseller.
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ChartPanel icon="SlidersHorizontal" title="Nama website">
          <SiteSettingsForm initial={settings} />
        </ChartPanel>

        <ChartPanel icon="KeyRound" title="Reseller Provider API Key">
          <ResellerKeyForm
            initialMasked={keyInfo.key ? maskKey(keyInfo.key) : null}
            initialSource={keyInfo.source}
          />
        </ChartPanel>
      </div>
    </div>
  );
}
