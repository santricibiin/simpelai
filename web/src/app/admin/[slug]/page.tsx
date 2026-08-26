import { notFound } from "next/navigation";
import { navFlat } from "@/lib/nav";
import { ChartPanel } from "@/components/admin/Motion";

export const dynamic = "force-dynamic";

export default async function AdminSectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = navFlat.find((n) => n.href === `/admin/${slug}`);
  if (!item) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{item.label}</h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Modul ini belum diimplementasikan. Struktur navigasi dan ikon sudah siap dipakai.
        </p>
      </div>

      <ChartPanel icon={item.icon} title={item.label}>
        <p className="py-12 text-center font-mono text-xs uppercase tracking-[0.14em] text-slate-400">
          placeholder · {slug}
        </p>
      </ChartPanel>
    </div>
  );
}
