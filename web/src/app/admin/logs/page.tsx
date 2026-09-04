import type { Metadata } from "next";
import LogsTable from "@/components/admin/LogsTable";
import { getLogs } from "@/lib/session";

export const metadata: Metadata = { title: "Request Logs" };
export const dynamic = "force-dynamic";

const EMPTY = {
  stats: { total: 0, failed: 0, tokens: 0, p50_ms: 0, p95_ms: 0, avg_ms: 0 },
  rows: [],
};

export default async function LogsPage() {
  const { data } = await getLogs(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Request Logs</h1>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Riwayat request per user beserta latency, token, dan provider yang melayani.
        </p>
      </div>

      <LogsTable initial={data ?? EMPTY} />
    </div>
  );
}
