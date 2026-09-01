import { NextResponse } from "next/server";
import { processPaymentCallback } from "@/lib/payment";

export const dynamic = "force-dynamic";

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return ((await req.json().catch(() => ({}))) as Record<string, unknown>) ?? {};
  }
  const form = await req.formData().catch(() => null);
  if (!form) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) out[k] = typeof v === "string" ? v : v.name;
  return out;
}

export async function POST(req: Request) {
  const body = await readBody(req);

  const headerSecret =
    req.headers.get("x-forward-secret") ??
    (req.headers.get("authorization")?.startsWith("Bearer ") ? req.headers.get("authorization")!.slice(7) : undefined);
  if (headerSecret) {
    if (!body.secret && !body.additionalParam1 && !body.param1) body.secret = headerSecret;
  }

  const r = await processPaymentCallback(body, "");
  return NextResponse.json({ ok: r.ok, ...(r.result ?? {}), ...(r.error ? { error: r.error } : {}) }, { status: r.status });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Callback aktif. Gunakan POST." });
}
