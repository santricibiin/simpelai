import type { Metadata } from "next";
import { Globe } from "lucide-react";
import BandelDomainForm from "@/components/admin/BandelDomainForm";
import CustomerKeys from "@/components/admin/CustomerKeys";
import ModelsList from "@/components/admin/ModelsList";
import ResellerBalance from "@/components/admin/ResellerBalance";
import { getBandelDomain } from "@/lib/bandel-domain";
import { getResellerQuota, listCustomerKeys, listModels } from "@/lib/reseller";

export const metadata: Metadata = { title: "Bandel" };
export const dynamic = "force-dynamic";

export default async function BandelPage() {
  const [quota, keys, models, domain] = await Promise.all([
    getResellerQuota(),
    listCustomerKeys({ page: 1, limit: 10 }),
    listModels(),
    getBandelDomain(),
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

      <section className="glass p-5">
        <header className="flex items-center gap-2 text-crimson-500">
          <Globe className="h-4 w-4" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em]">Domain Proxy</h2>
        </header>
        <div className="mt-4">
          <BandelDomainForm initial={domain} />
        </div>
      </section>

      <ModelsList initial={models.data?.data ?? []} />
      <CustomerKeys initial={keys.data} />
    </div>
  );
}
