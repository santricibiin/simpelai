import type { Metadata } from "next";
import { Activity, Boxes, KeyRound, TrendingUp } from "lucide-react";
import BandelDomainForm from "@/components/admin/BandelDomainForm";
import CollapseSection from "@/components/admin/CollapseSection";
import ContactSettingsForm from "@/components/admin/ContactSettingsForm";
import CustomerKeys from "@/components/admin/CustomerKeys";
import ModelsList from "@/components/admin/ModelsList";
import ResellerBalance from "@/components/admin/ResellerBalance";
import { getBandelDomain } from "@/lib/bandel-domain";
import { getContact } from "@/lib/contact";
import { getResellerQuota, listAllCustomerKeys, listCustomerKeys, listModels } from "@/lib/reseller";
import { fetchResellerKeys } from "@/lib/member-quota";

export const metadata: Metadata = { title: "Bandel" };
export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("id-ID");
const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);

export default async function BandelPage() {
  const [quota, keys, models, resellerKeys, domain, contact, allCustomers] = await Promise.all([
    getResellerQuota(),
    listCustomerKeys({ page: 1, limit: 10 }),
    listModels(),
    fetchResellerKeys(),
    getBandelDomain(),
    getContact(),
    listAllCustomerKeys().catch(() => []),
  ]);

  const tokenById = new Map<string, string>();
  for (const k of resellerKeys.keys ?? []) {
    if (k.secretToken && k.id != null) tokenById.set(String(k.id), k.secretToken);
  }

  const totalMemberKeys = allCustomers.length;
  const totalMemberQuota = allCustomers.reduce((s, c) => s + c.maxTokens, 0);
  const totalMemberRequests = allCustomers.reduce((s, c) => s + (c.usage?.requests ?? 0), 0);
  const totalMemberUsed = allCustomers.reduce((s, c) => s + c.usedTokens, 0);

  const memberCards = [
    { icon: KeyRound, label: "Total member keys", value: nf.format(totalMemberKeys), hint: "semua customer Anda" },
    { icon: Boxes, label: "Total kuota member", value: compact(totalMemberQuota), hint: nf.format(totalMemberQuota) },
    { icon: Activity, label: "Total request", value: compact(totalMemberRequests), hint: nf.format(totalMemberRequests) },
    { icon: TrendingUp, label: "Total terpakai", value: compact(totalMemberUsed), hint: nf.format(totalMemberUsed) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Bandel</h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Saldo, kuota, model, dan manajemen customer key reseller{" "}
          <span className="font-medium">bandelbanget.xyz</span>.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {memberCards.map((c) => (
          <li key={c.label} className="glass p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                {c.label}
              </span>
              <c.icon className="h-4 w-4 shrink-0 text-crimson-500" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{c.value}</p>
            <p className="mt-1 font-mono text-[10px] text-slate-400">{c.hint}</p>
          </li>
        ))}
      </ul>

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
