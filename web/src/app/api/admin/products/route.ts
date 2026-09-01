import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/reseller";
import { BANDEL_TIERS, createProduct, getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  return NextResponse.json({ products: await getProducts(), tiers: BANDEL_TIERS });
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

  const { name, source, tierId, tokens, validDays, price, stock } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim() || name.trim().length > 60) {
    return NextResponse.json({ error: "nama produk wajib diisi (maks 60 karakter)" }, { status: 400 });
  }
  if (source !== "bandel" && source !== "gateway") {
    return NextResponse.json({ error: "sumber stok harus bandel atau gateway" }, { status: 400 });
  }

  let finalTokens = 0;
  let finalDays = 0;
  let finalTier: string | undefined;

  if (source === "bandel") {
    const tier = BANDEL_TIERS.find((t) => t.id === tierId);
    if (!tier) return NextResponse.json({ error: "paket bandel tidak valid" }, { status: 400 });
    finalTokens = tier.tokens;
    finalDays = tier.validDays;
    finalTier = tier.id;
  } else {
    if (typeof tokens !== "number" || !Number.isInteger(tokens) || tokens < 1_000_000) {
      return NextResponse.json({ error: "jumlah token minimal 1.000.000" }, { status: 400 });
    }
    if (typeof validDays !== "number" || !Number.isInteger(validDays) || validDays < 1 || validDays > 365) {
      return NextResponse.json({ error: "masa aktif harus 1-365 hari" }, { status: 400 });
    }
    finalTokens = tokens;
    finalDays = validDays;
  }

  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "harga tidak valid" }, { status: 400 });
  }

  let finalStock: number | null = null;
  if (source === "gateway") {
    if (stock !== null && stock !== undefined) {
      if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0) {
        return NextResponse.json({ error: "stok tidak valid" }, { status: 400 });
      }
      finalStock = stock;
    }
  }

  const product = await createProduct({
    name: name.trim(),
    source,
    tierId: finalTier,
    tokens: finalTokens,
    validDays: finalDays,
    price,
    stock: finalStock,
  });
  return NextResponse.json(product, { status: 201 });
}
