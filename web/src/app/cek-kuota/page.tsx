import type { Metadata } from "next";
import CheckQuotaForm from "@/components/member/CheckQuotaForm";
import MemberHeader from "@/components/member/MemberHeader";
import { getSettings } from "@/lib/session";

export const metadata: Metadata = { title: "Cek Kuota" };
export const dynamic = "force-dynamic";

export default async function CheckQuotaPage() {
  const settings = await getSettings();

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-[size:44px_44px] opacity-15 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-crimson/15 blur-[110px]" />
      <MemberHeader siteName={settings.site_name} />
      <main className="px-4 py-12 sm:px-6 lg:px-8">
        <CheckQuotaForm />
      </main>
    </div>
  );
}
