import type { Metadata } from "next";
import CustomerKeys from "@/components/admin/CustomerKeys";
import ModelsList from "@/components/admin/ModelsList";
import ResellerBalance from "@/components/admin/ResellerBalance";
import { getResellerQuota, listCustomerKeys, listModels } from "@/lib/reseller";

export const metadata: Metadata = { title: "Bandel" };
export const dynamic = "force-dynamic";

export default async function BandelPage() {
  const [quota, keys, models] = await Promise.all([
    getResellerQuota(),
    listCustomerKeys({ page: 1, limit: 10 }),
    listModels(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Bandel</h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Saldo, kuota, model, dan manajemen customer key reseller{" "}
          <span className="font-medium">bandelbanget.xyz</span>.
        </p>
      </div>

      <ResellerBalance initial={quota.data} />
      <ModelsList initial={models.data?.data ?? []} />
      <CustomerKeys initial={keys.data} />
    </div>
  );
}
