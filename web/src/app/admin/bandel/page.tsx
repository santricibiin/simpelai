import type { Metadata } from "next";
import BandelDomainForm from "@/components/admin/BandelDomainForm";
import CollapseSection from "@/components/admin/CollapseSection";
import ContactSettingsForm from "@/components/admin/ContactSettingsForm";
import CustomerKeys from "@/components/admin/CustomerKeys";
import ModelsList from "@/components/admin/ModelsList";
import ResellerBalance from "@/components/admin/ResellerBalance";
import { getBandelDomain } from "@/lib/bandel-domain";
import { getContact } from "@/lib/contact";
import { getResellerQuota, listCustomerKeys, listModels } from "@/lib/reseller";
import { fetchResellerKeys } from "@/lib/member-quota";

export const metadata: Metadata = { title: "Bandel" };
export const dynamic = "force-dynamic";

export default async function BandelPage() {
  const [quota, keys, models, resellerKeys, domain, contact] = await Promise.all([
    getResellerQuota(),
    listCustomerKeys({ page: 1, limit: 10 }),
    listModels(),
    fetchResellerKeys(),
    getBandelDomain(),
    getContact(),
  ]);

  const tokenById = new Map<string, string>();
  for (const k of resellerKeys.keys ?? []) {
    if (k.secretToken && k.id != null) tokenById.set(String(k.id), k.secretToken);
  }

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

      <CollapseSection icon="MessageSquareHeart" title="Kontak Member" hint={contact.telegram ? `@${contact.telegram}` : "belum diset"}>
        <ContactSettingsForm initial={contact} />
      </CollapseSection>

      <CollapseSection icon="Globe" title="Domain Proxy" hint={domain}>
        <BandelDomainForm initial={domain} />
      </CollapseSection>

      <ModelsList initial={models.data?.data ?? []} />
      <CustomerKeys initial={keys.data} tokenById={tokenById} />
    </div>
  );
}
