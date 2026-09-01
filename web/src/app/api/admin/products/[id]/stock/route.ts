import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/reseller";
import { addStockItems, getProducts, removeStockItems } from "@/lib/products";

export const dynamic = "force-dynamic";

function parseItems(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.includes(":"));
}

/** Daftar semua item stok produk manual. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { id } = await params;
  const product = (await getProducts()).find((p) => p.id === id && p.source === "manual");
  if (!product) return NextResponse.json({ error: "Produk manual tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ items: product.stockItems ?? [], stock: product.stock ?? 0 });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body harus JSON" }, { status: 400 });
  }

  const raw = (body as { items?: unknown }).items;
  const items = parseItems(raw);
  if (items.length === 0) {
    return NextResponse.json({ error: "Tidak ada baris valid — format per baris: email:password" }, { status: 400 });
  }

  const r = await addStockItems(id, items);
  if (!r) return NextResponse.json({ error: "Produk manual tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ added: r.added, duplicates: r.duplicates, stock: r.product.stock });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body harus JSON" }, { status: 400 });
  }

  const raw = (body as { items?: unknown }).items;
  const items = parseItems(raw);
  if (items.length === 0) {
    return NextResponse.json({ error: "Tidak ada baris valid" }, { status: 400 });
  }

  const r = await removeStockItems(id, items);
  if (!r) return NextResponse.json({ error: "Produk manual tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ removed: r.removed, stock: r.product.stock });
}
