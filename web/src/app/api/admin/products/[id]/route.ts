import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/reseller";
import { deleteProduct, updateProduct } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body harus JSON" }, { status: 400 });
  }

  const { name, price, enabled, stock } = (body ?? {}) as Record<string, unknown>;

  const patch: { name?: string; price?: number; enabled?: boolean; stock?: number | null } = {};
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim() || name.trim().length > 60) {
      return NextResponse.json({ error: "nama tidak valid" }, { status: 400 });
    }
    patch.name = name;
  }
  if (price !== undefined) {
    if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "harga tidak valid" }, { status: 400 });
    }
    patch.price = price;
  }
  if (enabled !== undefined) {
    if (typeof enabled !== "boolean") return NextResponse.json({ error: "enabled harus boolean" }, { status: 400 });
    patch.enabled = enabled;
  }
  if (stock !== undefined) {
    if (stock !== null && (typeof stock !== "number" || !Number.isInteger(stock) || stock < 0)) {
      return NextResponse.json({ error: "stok tidak valid" }, { status: 400 });
    }
    patch.stock = stock;
  }

  const updated = await updateProduct(id, patch);
  if (!updated) return NextResponse.json({ error: "produk tidak ditemukan" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { id } = await params;
  const ok = await deleteProduct(id);
  if (!ok) return NextResponse.json({ error: "produk tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
