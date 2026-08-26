import type { Metadata } from "next";
import KeysManager from "@/components/admin/KeysManager";
import { getPlatformKeys } from "@/lib/session";

export const metadata: Metadata = { title: "API Keys" };
export const dynamic = "force-dynamic";

export default async function KeysPage() {
  const { data } = await getPlatformKeys();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">API Keys</h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Key untuk mengakses gateway. Disimpan sebagai hash SHA-256 — tidak dapat dilihat lagi setelah dibuat.
        </p>
      </div>

      <KeysManager initial={data ?? []} />
    </div>
  );
}
