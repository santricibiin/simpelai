import { query } from "./db";

export type PublicProduct = {
  id: string;
  name: string;
  category: string;
  tokens: number;
  validDays: number;
  price: number;
  stock: number | null;
  soldCount: number;
};

interface Row {
  id: string;
  name: string;
  category: string | null;
  tokens: number;
  valid_days: number;
  price: number;
  stock: number | null;
  sold_count: number;
}

/** Produk aktif untuk halaman publik. Stok null = tak terbatas (bandel/gateway). */
export async function getPublicProducts(): Promise<PublicProduct[]> {
  const rows = await query<Row>(
    `SELECT id, name, category, tokens, valid_days, price, stock, sold_count
     FROM products
     WHERE enabled = 1 AND (stock IS NULL OR stock > 0)
     ORDER BY price ASC, tokens ASC`,
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category?.trim() || "Token AI",
    tokens: Number(r.tokens),
    validDays: r.valid_days,
    price: r.price,
    stock: r.stock === null ? null : Number(r.stock),
    soldCount: r.sold_count,
  }));
}
