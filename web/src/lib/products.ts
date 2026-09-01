import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const FILE = "data/products.json";

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
  enabled: boolean;
  stock: number | null;
  stockItems?: string[];
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

async function read(): Promise<ProductList> {
  try {
    const raw = JSON.parse(await fs.readFile(FILE, "utf8")) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((p): p is Product => {
      const q = p as Product;
      return typeof q?.id === "string" && typeof q?.name === "string" && ["bandel", "gateway", "manual"].includes(q?.source);
    });
  } catch {
    return [];
  }
}

async function write(list: ProductList): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(list, null, 2) + "\n", { mode: 0o600 });
}

export const getProducts = () => read();

export async function createProduct(input: {
  name: string;
  source: "bandel" | "gateway" | "manual";
  tierId?: string;
  category?: string;
  productCode?: string;
  tokens: number;
  validDays: number;
  price: number;
  stock: number | null;
  stockItems?: string[];
}): Promise<Product> {
  const list = await read();
  const product: Product = {
    id: randomUUID().slice(0, 8),
    name: input.name.trim(),
    source: input.source,
    tierId: input.source === "bandel" ? input.tierId : undefined,
    category: input.source === "manual" ? (input.category ?? "").trim() : undefined,
    productCode: input.source === "manual" ? (input.productCode ?? "").trim().toUpperCase() : undefined,
    tokens: input.tokens,
    validDays: input.validDays,
    price: input.price,
    enabled: true,
    stock: input.source === "manual" ? (input.stockItems?.length ?? 0) : input.source === "gateway" ? input.stock : null,
    stockItems: input.source === "manual" ? (input.stockItems ?? []) : undefined,
    soldCount: 0,
    createdAt: new Date().toISOString(),
  };
  list.push(product);
  await write(list);
  return product;
}

export async function updateProduct(
  id: string,
  patch: { name?: string; price?: number; enabled?: boolean; stock?: number | null; category?: string; productCode?: string }
): Promise<Product | null> {
  const list = await read();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const p = list[idx];
  if (patch.name !== undefined) p.name = patch.name.trim();
  if (patch.price !== undefined && Number.isFinite(patch.price) && patch.price >= 0) p.price = patch.price;
  if (patch.enabled !== undefined) p.enabled = patch.enabled;
  if (patch.category !== undefined && p.source === "manual") p.category = patch.category.trim();
  if (patch.productCode !== undefined && p.source === "manual") p.productCode = patch.productCode.trim().toUpperCase();
  if (patch.stock !== undefined && p.source === "gateway") p.stock = patch.stock;
  list[idx] = p;
  await write(list);
  return p;
}

/** Tambah stok manual (append, tanpa duplikat). */
export async function addStockItems(id: string, items: string[]): Promise<{ product: Product; added: number; duplicates: number } | null> {
  const list = await read();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1 || list[idx].source !== "manual") return null;

  const p = list[idx];
  p.stockItems = p.stockItems ?? [];
  const existing = new Set(p.stockItems);
  let added = 0;
  let duplicates = 0;
  for (const it of items) {
    if (existing.has(it)) duplicates++;
    else {
      p.stockItems.push(it);
      existing.add(it);
      added++;
    }
  }
  p.stock = p.stockItems.length;
  list[idx] = p;
  await write(list);
  return { product: p, added, duplicates };
}

/** Hapus stok manual (menghapus baris yang sama persis). */
export async function removeStockItems(id: string, items: string[]): Promise<{ product: Product; removed: number } | null> {
  const list = await read();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1 || list[idx].source !== "manual") return null;

  const p = list[idx];
  const toRemove = new Set(items);
  const before = p.stockItems?.length ?? 0;
  p.stockItems = (p.stockItems ?? []).filter((i) => !toRemove.has(i));
  const removed = before - p.stockItems.length;
  p.stock = p.stockItems.length;
  list[idx] = p;
  await write(list);
  return { product: p, removed };
}

/** Ambil 1 item stok (FIFO) untuk delivery — dipakai saat order manual dibayar. */
export async function takeStockItem(id: string): Promise<{ item: string; product: Product } | null> {
  const list = await read();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1 || list[idx].source !== "manual") return null;

  const p = list[idx];
  if (!p.stockItems || p.stockItems.length === 0) return null;

  const item = p.stockItems.shift()!;
  p.stock = p.stockItems.length;
  p.soldCount = (p.soldCount ?? 0) + 1;
  list[idx] = p;
  await write(list);
  return { item, product: p };
}

export async function deleteProduct(id: string): Promise<boolean> {
  const list = await read();
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) return false;
  await write(next);
  return true;
}
