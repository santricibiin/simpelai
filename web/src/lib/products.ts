import { query, execute } from "./db";
import { randomUUID } from "node:crypto";

export type Product = {
  id: string;
  name: string;
  source: "bandel" | "gateway" | "manual";
  tierId?: string;
  category?: string;
  productCode?: string;
  tokens: number;
  validDays: number;
  price: number;
  promoBadge?: string | null;
  enabled: boolean;
  stock: number | null;
  soldCount?: number;
  createdAt: string;
};

export type ProductList = Product[];

export const BANDEL_TIERS: { id: string; label: string; tokens: number; validDays: number }[] = [
  { id: "5m", label: "5 juta", tokens: 5_000_000, validDays: 28 },
  { id: "10m", label: "10 juta", tokens: 10_000_000, validDays: 28 },
  { id: "20m", label: "20 juta", tokens: 20_000_000, validDays: 28 },
  { id: "50m", label: "50 juta", tokens: 50_000_000, validDays: 28 },
  { id: "100m", label: "100 juta", tokens: 100_000_000, validDays: 28 },
  { id: "200m", label: "200 juta", tokens: 200_000_000, validDays: 28 },
  { id: "500m", label: "500 juta", tokens: 500_000_000, validDays: 28 },
  { id: "1b", label: "1 miliar", tokens: 1_000_000_000, validDays: 28 },
  { id: "2b", label: "2 miliar", tokens: 2_000_000_000, validDays: 28 },
  { id: "5b", label: "5 miliar", tokens: 5_000_000_000, validDays: 28 },
  { id: "10b", label: "10 miliar", tokens: 10_000_000_000, validDays: 28 },
  { id: "20b", label: "20 miliar", tokens: 20_000_000_000, validDays: 28 },
  { id: "50b", label: "50 miliar", tokens: 50_000_000_000, validDays: 28 },
  { id: "100b", label: "100 miliar", tokens: 100_000_000_000, validDays: 28 },
];

interface ProductRow {
  id: string;
  name: string;
  source: Product["source"];
  tier_id: string | null;
  category: string | null;
  product_code: string | null;
  tokens: number;
  valid_days: number;
  price: number;
  promo_badge: string | null;
  enabled: number;
  stock: number | null;
  sold_count: number;
  created_at: Date;
}

function mapRow(r: ProductRow): Product {
  return {
    id: r.id,
    name: r.name,
    source: r.source,
    tierId: r.tier_id ?? undefined,
    category: r.category ?? undefined,
    productCode: r.product_code ?? undefined,
    tokens: Number(r.tokens),
    validDays: r.valid_days,
    price: r.price,
    promoBadge: r.promo_badge ?? null,
    enabled: Boolean(r.enabled),
    stock: r.stock === null ? null : Number(r.stock),
    soldCount: r.sold_count,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export async function getProducts(): Promise<ProductList> {
  const rows = await query<ProductRow>("SELECT * FROM products ORDER BY created_at ASC");
  return rows.map(mapRow);
}

export async function createProduct(input: {
  name: string;
  source: "bandel" | "gateway" | "manual";
  tierId?: string;
  category?: string;
  productCode?: string;
  tokens: number;
  validDays: number;
  price: number;
  promoBadge?: string | null;
  stock: number | null;
  stockItems?: string[];
}): Promise<Product> {
  const id = randomUUID().slice(0, 8);
  const stock = input.source === "manual" ? (input.stockItems?.length ?? 0) : input.stock;
  await execute(
    `INSERT INTO products (id, name, source, tier_id, category, product_code, tokens, valid_days, price, promo_badge, enabled, stock, sold_count)
     VALUES (?,?,?,?,?,?,?,?,?,?,1,?,0)`,
    [
      id, input.name.trim(), input.source, input.tierId ?? null, input.category ?? null, input.productCode ?? null,
      input.tokens, input.validDays, input.price, input.promoBadge ?? null, stock,
    ]
  );
  if (input.source === "manual" && input.stockItems?.length) {
    for (const item of input.stockItems) {
      await execute("INSERT IGNORE INTO product_stocks (product_id, value) VALUES (?, ?)", [id, item]);
    }
  }
  const rows = await query<ProductRow>("SELECT * FROM products WHERE id = ?", [id]);
  return mapRow(rows[0]);
}

export async function updateProduct(
  id: string,
  patch: { name?: string; price?: number; enabled?: boolean; stock?: number | null; category?: string; productCode?: string; promoBadge?: string | null }
): Promise<Product | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.name !== undefined) {
    sets.push("name = ?");
    params.push(patch.name.trim());
  }
  if (patch.price !== undefined && Number.isFinite(patch.price) && patch.price >= 0) {
    sets.push("price = ?");
    params.push(patch.price);
  }
  if (patch.promoBadge !== undefined) {
    sets.push("promo_badge = ?");
    params.push(patch.promoBadge);
  }
  if (patch.enabled !== undefined) {
    sets.push("enabled = ?");
    params.push(patch.enabled ? 1 : 0);
  }
  if (patch.stock !== undefined) {
    sets.push("stock = ?");
    params.push(patch.stock);
  }
  if (patch.category !== undefined) {
    sets.push("category = ?");
    params.push(patch.category.trim());
  }
  if (patch.productCode !== undefined) {
    sets.push("product_code = ?");
    params.push(patch.productCode.trim().toUpperCase());
  }
  if (sets.length === 0) return null;
  params.push(id);
  await execute(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`, params);
  const rows = await query<ProductRow>("SELECT * FROM products WHERE id = ?", [id]);
  return rows.length ? mapRow(rows[0]) : null;
}

/** Tambah stok manual (duplikat di-skip oleh UNIQUE key). */
export async function addStockItems(id: string, items: string[]): Promise<{ product: Product; added: number; duplicates: number } | null> {
  const rows = await query<ProductRow>("SELECT * FROM products WHERE id = ? AND source = 'manual'", [id]);
  if (rows.length === 0) return null;

  let added = 0;
  for (const item of items) {
    const r = await execute("INSERT IGNORE INTO product_stocks (product_id, value) VALUES (?, ?)", [id, item]);
    if (r.affectedRows === 1) added++;
  }
  const duplicates = items.length - added;
  await execute(
    "UPDATE products SET stock = (SELECT COUNT(*) FROM product_stocks WHERE product_id = ?) WHERE id = ?",
    [id, id]
  );
  const fresh = await query<ProductRow>("SELECT * FROM products WHERE id = ?", [id]);
  return { product: mapRow(fresh[0]), added, duplicates };
}

/** Hapus stok manual (baris sama persis). */
export async function removeStockItems(id: string, items: string[]): Promise<{ product: Product; removed: number } | null> {
  const rows = await query<ProductRow>("SELECT * FROM products WHERE id = ? AND source = 'manual'", [id]);
  if (rows.length === 0) return null;

  let removed = 0;
  for (const item of items) {
    const r = await execute("DELETE FROM product_stocks WHERE product_id = ? AND value = ?", [id, item]);
    removed += r.affectedRows;
  }
  await execute(
    "UPDATE products SET stock = (SELECT COUNT(*) FROM product_stocks WHERE product_id = ?) WHERE id = ?",
    [id, id]
  );
  const fresh = await query<ProductRow>("SELECT * FROM products WHERE id = ?", [id]);
  return { product: mapRow(fresh[0]), removed };
}

/** Ambil daftar stok manual. */
export async function getStockItems(id: string): Promise<string[]> {
  const rows = await query<{ value: string }>("SELECT value FROM product_stocks WHERE product_id = ? ORDER BY id ASC", [id]);
  return rows.map((r) => r.value);
}

/** Ambil N item stok FIFO (atomic) — untuk delivery order manual. */
export async function takeStockItems(id: string, qty: number): Promise<string[] | null> {
  const conn = await (await import("./db")).pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query("SELECT id, value FROM product_stocks WHERE product_id = ? ORDER BY id ASC LIMIT ? FOR UPDATE", [id, qty]);
    const items = rows as { id: number; value: string }[];
    if (items.length < qty) {
      await conn.rollback();
      return null;
    }
    await conn.query("DELETE FROM product_stocks WHERE id IN (?)", [items.map((i) => i.id)]);
    await conn.query("UPDATE products SET stock = stock - ?, sold_count = sold_count + ? WHERE id = ?", [qty, qty, id]);
    await conn.commit();
    return items.map((i) => i.value);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  const r = await execute("DELETE FROM products WHERE id = ?", [id]);
  if (r.affectedRows !== 1) return false;
  await execute("DELETE FROM product_stocks WHERE product_id = ?", [id]);
  return true;
}
