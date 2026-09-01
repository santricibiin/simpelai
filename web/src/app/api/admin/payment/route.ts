import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/reseller";
import { getPaymentSettings, listOrders, setPaymentSettings, verifyQrisCrc } from "@/lib/payment";
import type { PaymentSettings, QrisProvider } from "@/lib/payment";

export const dynamic = "force-dynamic";

const PROVIDERS: QrisProvider[] = ["none", "dana", "neobank", "gopay"];

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(Math.max(1, Number(url.searchParams.get("limit") ?? "10") || 10), 50);
  const status = url.searchParams.get("status");

  const [settings, all] = await Promise.all([getPaymentSettings(), listOrders(500)]);
  const filtered = status && status !== "all" ? all.filter((o) => o.status === status) : all;
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, totalPages);
  const orders = filtered.slice((safePage - 1) * limit, safePage * limit);

  return NextResponse.json({
    settings,
    orders,
    total: filtered.length,
    page: safePage,
    totalPages,
    counts: {
      all: all.length,
      paid: all.filter((o) => o.status === "paid").length,
      pending: all.filter((o) => o.status === "pending").length,
      expired: all.filter((o) => o.status === "expired").length,
      failed: all.filter((o) => o.status === "failed").length,
    },
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body harus JSON" }, { status: 400 });
  }

  const { qrisProvider, qrisStatic, uniqueCodeEnabled, ttlMinutes, forwarderSecret, maxPendingOrders } = (body ?? {}) as Record<string, unknown>;

  if (!PROVIDERS.includes(qrisProvider as QrisProvider)) {
    return NextResponse.json({ error: "provider harus none/dana/neobank/gopay" }, { status: 400 });
  }

  const qris = typeof qrisStatic === "string" ? qrisStatic.trim() : "";
  if (qrisProvider !== "none" && !qris) {
    return NextResponse.json({ error: "QRIS statis wajib diisi bila gateway aktif." }, { status: 400 });
  }
  if (qris && !verifyQrisCrc(qris)) {
    return NextResponse.json({ error: "QRIS statis tidak valid (CRC gagal). Tempel ulang dari aplikasi merchant." }, { status: 400 });
  }

  if (typeof uniqueCodeEnabled !== "boolean") {
    return NextResponse.json({ error: "uniqueCodeEnabled harus boolean" }, { status: 400 });
  }

  const ttl = Number(ttlMinutes);
  if (!Number.isFinite(ttl) || ttl < 1 || ttl > 120) {
    return NextResponse.json({ error: "TTL harus 1-120 menit." }, { status: 400 });
  }

  const maxPending = Number(maxPendingOrders);
  if (!Number.isFinite(maxPending) || maxPending < 1 || maxPending > 10) {
    return NextResponse.json({ error: "Rate limit harus 1-10 pesanan pending." }, { status: 400 });
  }

  const secretRaw = typeof forwarderSecret === "string" ? forwarderSecret.trim() : "";
  // field kosong = pertahankan secret lama (seperti behavior token bot)
  const current = await getPaymentSettings();
  const secret = secretRaw || current.forwarderSecret;
  if (secret && secret.length < 8) {
    return NextResponse.json({ error: "Secret callback minimal 8 karakter." }, { status: 400 });
  }

  const settings: PaymentSettings = {
    qrisProvider: qrisProvider as QrisProvider,
    qrisStatic: qris,
    uniqueCodeEnabled,
    ttlMinutes: Math.round(ttl),
    forwarderSecret: secret,
    maxPendingOrders: Math.round(maxPending),
  };
  await setPaymentSettings(settings);
  return NextResponse.json({ ok: true, settings: { ...settings, qrisStatic: qris ? `${qris.slice(0, 24)}…` : "" } });
}
