import type { Metadata } from "next";
import { ChartPanel } from "@/components/admin/Motion";
import SiteSettingsForm from "@/components/admin/SiteSettingsForm";
import { getSettings } from "@/lib/session";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">Nama website yang tampil di navbar dan footer.</p>
      </div>

      <ChartPanel icon="SlidersHorizontal" title="Nama website">
        <SiteSettingsForm initial={settings} />
      </ChartPanel>
    </div>
  );
}
