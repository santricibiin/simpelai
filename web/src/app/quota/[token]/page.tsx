import type { Metadata } from "next";
import QuotaDashboardClient from "@/components/member/QuotaDashboardClient";
import { getSettings } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard Kuota" };
export const dynamic = "force-dynamic";

export default async function QuotaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const settings = await getSettings();

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-[size:44px_44px] opacity-15 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-crimson/15 blur-[110px]" />
      <QuotaDashboardClient token={token} siteName={settings.site_name} />
    </div>
  );
}
