import { NextResponse } from "next/server";
import { countPendingByToken, createOrder, getPaymentSettings } from "@/lib/payment";
import { getProducts } from "@/lib/products";
import { fetchResellerKeys, getResellerQuotaTokens } from "@/lib/member-quota";

export const dynamic = "force-dynamic";

const TOKEN_RE = /^[a-fA-F0-9]{16,128}$/;

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: "Token tidak valid." }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON." }, { status: 400 });
  }

  const productId = (body as { productId?: unknown })?.productId;
  if (typeof productId !== "string" || !productId) {
    return NextResponse.json({ error: "Produk wajib dipilih." }, { status: 400 });
  }

  const product = (await getProducts()).find((p) => p.id === productId && p.enabled);
  if (!product) return NextResponse.json({ error: "Produk tidak tersedia." }, { status: 404 });

  // rate limit: maksimal N pesanan pending aktif (atur di admin payment)
  const settings = await getPaymentSettings();
  const pending = await countPendingByToken(token);
  if (pending >= settings.maxPendingOrders) {
    return NextResponse.json(
      { error: `Kamu punya ${pending} pesanan menunggu pembayaran. Selesaikan (bayar atau batalkan) dulu sebelum membuat pesanan baru.` },
      { status: 429 }
    );
  }

  // validasi member token + stok kuota reseller (produk bandel)
  let memberName: string | null = null;
  try {
    const keys = await fetchResellerKeys();
    const member = (keys.keys ?? []).find((k) => k.secretToken === token);
    if (!member) return NextResponse.json({ error: "Token member tidak valid." }, { status: 404 });
    memberName = member.name ?? null;
  } catch {
    return NextResponse.json({ error: "Gagal memverifikasi member, coba lagi." }, { status: 502 });
  }

  if (product.source === "bandel") {
    const quota = await getResellerQuotaTokens().catch(() => null);
    if (quota !== null && product.tokens > quota) {
      return NextResponse.json({ error: "Stok kuota tidak cukup. Hubungi admin." }, { status: 409 });
    }
  }

  const r = await createOrder({
    amount: product.price,
    productId: product.id,
    productName: product.name,
    tokens: product.tokens,
    validDays: product.validDays,
    source: product.source,
    tierId: product.tierId,
    buyerToken: token,
  });

  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });

  return NextResponse.json({
    invoice: r.order.invoice,
    amount: r.order.amount,
    uniqueCode: r.order.uniqueCode,
    qrisPayload: r.order.qrisPayload,
    expiresAt: r.order.expiresAt,
    ttlMinutes: Math.round((new Date(r.order.expiresAt).getTime() - Date.now()) / 60000),
    productName: r.order.productName,
    memberName,
  });
}
