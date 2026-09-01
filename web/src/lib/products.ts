import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const FILE = "data/products.json";

export type Product = {
  id: string;
  name: string;
  source: "bandel" | "gateway";
  tierId?: string;
  tokens: number;
  validDays: number;
  price: number;
  enabled: boolean;
  stock: number | null;
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
      return typeof q?.id === "string" && typeof q?.name === "string" && (q?.source === "bandel" || q?.source === "gateway");
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
  source: "bandel" | "gateway";
  tierId?: string;
  tokens: number;
  validDays: number;
  price: number;
  stock: number | null;
}): Promise<Product> {
  const list = await read();
  const product: Product = {
    id: randomUUID().slice(0, 8),
    name: input.name.trim(),
    source: input.source,
    tierId: input.source === "bandel" ? input.tierId : undefined,
    tokens: input.tokens,
    validDays: input.validDays,
    price: input.price,
    enabled: true,
    stock: input.source === "gateway" ? input.stock : null,
    createdAt: new Date().toISOString(),
  };
  list.push(product);
  await write(list);
  return product;
}

export async function updateProduct(
  id: string,
  patch: { name?: string; price?: number; enabled?: boolean; stock?: number | null }
): Promise<Product | null> {
  const list = await read();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const p = list[idx];
  if (patch.name !== undefined) p.name = patch.name.trim();
  if (patch.price !== undefined && Number.isFinite(patch.price) && patch.price >= 0) p.price = patch.price;
  if (patch.enabled !== undefined) p.enabled = patch.enabled;
  if (patch.stock !== undefined && p.source === "gateway") p.stock = patch.stock;
  list[idx] = p;
  await write(list);
  return p;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const list = await read();
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) return false;
  await write(next);
  return true;
}
