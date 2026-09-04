import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/reseller";
import { BANDEL_TIERS, createProduct, getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  return NextResponse.json({ products: await getProducts(), tiers: BANDEL_TIERS });
}

function parseStockItems(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.includes(":"));
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

  const { name, source, tierId, category, productCode, tokens, validDays, price, promoBadge, stock, stockItems } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim() || name.trim().length > 60) {
    return NextResponse.json({ error: "nama produk wajib diisi (maks 60 karakter)" }, { status: 400 });
  }
  if (source !== "bandel" && source !== "gateway" && source !== "manual") {
    return NextResponse.json({ error: "sumber stok harus bandel, gateway, atau manual" }, { status: 400 });
  }

  let finalTokens = 0;
  let finalDays = 0;
  let finalTier: string | undefined;
  let finalCategory: string | undefined;
  let finalCode: string | undefined;
  let finalStock: number | null = null;
  let finalStockItems: string[] | undefined;

  if (source === "bandel") {
    const tier = BANDEL_TIERS.find((t) => t.id === tierId);
    if (!tier) return NextResponse.json({ error: "paket bandel tidak valid" }, { status: 400 });
    finalTokens = tier.tokens;
    finalDays = tier.validDays;
    finalTier = tier.id;
  } else if (source === "gateway") {
    if (typeof tokens !== "number" || !Number.isInteger(tokens) || tokens < 1_000_000) {
      return NextResponse.json({ error: "jumlah token minimal 1.000.000" }, { status: 400 });
    }
    if (typeof validDays !== "number" || !Number.isInteger(validDays) || validDays < 1 || validDays > 365) {
      return NextResponse.json({ error: "masa aktif harus 1-365 hari" }, { status: 400 });
    }
    finalTokens = tokens;
    finalDays = validDays;
    if (stock !== null && stock !== undefined) {
      if (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0) {
        return NextResponse.json({ error: "stok tidak valid" }, { status: 400 });
      }
      finalStock = stock;
    }
  } else {
    finalTokens = 0;
    finalDays = 0;
    finalCategory = typeof category === "string" ? category.trim().slice(0, 40) : "";
    if (!finalCategory) return NextResponse.json({ error: "kategori wajib diisi untuk produk manual" }, { status: 400 });
    finalCode = typeof productCode === "string" ? productCode.trim().slice(0, 20) : "";
    if (!finalCode) return NextResponse.json({ error: "code produk wajib diisi untuk produk manual" }, { status: 400 });
    finalStockItems = parseStockItems(stockItems);
  }

  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "harga tidak valid" }, { status: 400 });
  }

  let finalPromo: string | null = null;
  if (promoBadge !== undefined && promoBadge !== null) {
    if (typeof promoBadge !== "string") {
      return NextResponse.json({ error: "badge promo tidak valid" }, { status: 400 });
    }
    finalPromo = promoBadge.trim().slice(0, 30) || null;
  }

  const product = await createProduct({
    name: name.trim(),
    source,
    tierId: finalTier,
    category: finalCategory,
    productCode: finalCode,
    tokens: finalTokens,
    validDays: finalDays,
    price,
    promoBadge: finalPromo,
    stock: finalStock,
    stockItems: finalStockItems,
  });
  return NextResponse.json(product, { status: 201 });
}
