import type { Metadata } from "next";
import RoutingManager from "@/components/admin/RoutingManager";
import { getProviders } from "@/lib/session";

export const metadata: Metadata = { title: "Routing" };
export const dynamic = "force-dynamic";

export default async function RoutingPage() {
  const { data } = await getProviders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Routing</h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Provider OpenAI-compatible yang melayani <code className="font-mono text-xs">/v1/chat/completions</code>.
          Request dirutekan berdasarkan prioritas dengan fallback otomatis.
        </p>
      </div>

      <RoutingManager initial={data ?? []} />
    </div>
  );
}
