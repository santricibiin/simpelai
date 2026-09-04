import { query } from "./db";
import { getResellerQuota } from "./reseller";

export type PublicProduct = {
  id: string;
  name: string;
  category: string;
  source: "bandel" | "gateway" | "manual";
  tokens: number;
  validDays: number;
  price: number;
  stock: number | null;
  soldCount: number;
  /** false = tidak bisa dipesan sekarang (kuota reseller kurang / stok habis). */
  available: boolean;
  /** Alasan singkat kalau available = false. */
  reason?: string;
};

interface Row {
  id: string;
  name: string;
  category: string | null;
  source: PublicProduct["source"];
  tokens: number;
  valid_days: number;
  price: number;
  stock: number | null;
  sold_count: number;
}

/**
 * Cache kuota reseller 45 detik. Halaman publik force-dynamic, tanpa cache
 * setiap pengunjung memicu satu panggilan ke bandelbanget.xyz.
 */
const QUOTA_TTL_MS = 45_000;
let quotaCache: { at: number; quota: number | null } | null = null;

async function resellerQuotaTokens(): Promise<number | null> {
  if (quotaCache && Date.now() - quotaCache.at < QUOTA_TTL_MS) return quotaCache.quota;

  const r = await getResellerQuota().catch(() => null);
  // null = tidak diketahui (upstream error) — jangan dianggap habis.
  const quota = r?.data ? r.data.quota : null;
  quotaCache = { at: Date.now(), quota };
  return quota;
}

/** Buang cache kuota — panggil setelah top up / ganti key reseller. */
export function invalidateResellerQuotaCache(): void {
  quotaCache = null;
}

/**
 * Produk aktif untuk halaman publik.
 *
 * Ketersediaan per sumber stok:
 * - bandel  : dicek terhadap kuota reseller di bandelbanget.xyz (butuh tokens ≤ kuota).
 *             Kuota bisa diisi ulang, jadi produk tetap tampil tapi ditandai habis.
 * - manual  : stok baris akun; 0 = produk hilang dari daftar.
 * - gateway : stok null = tak terbatas, 0 = hilang dari daftar.
 */
export async function getPublicProducts(): Promise<PublicProduct[]> {
  const rows = await query<Row>(
    `SELECT id, name, category, source, tokens, valid_days, price, stock, sold_count
     FROM products
     WHERE enabled = 1
       AND (source = 'bandel' OR stock IS NULL OR stock > 0)
     ORDER BY price ASC, tokens ASC`,
  );

  const perluKuota = rows.some((r) => r.source === "bandel");
  const kuota = perluKuota ? await resellerQuotaTokens() : null;

  const list = rows.map<PublicProduct>((r) => {
    const tokens = Number(r.tokens);
    const stock = r.stock === null ? null : Number(r.stock);

    let available = true;
    let reason: string | undefined;

    if (r.source === "bandel") {
      // kuota null = upstream tak terjawab; jangan blokir penjualan, order tetap
      // diverifikasi ulang saat fulfillment.
      if (kuota !== null && tokens > kuota) {
        available = false;
        reason = "kuota reseller tidak cukup";
      }
    } else if (stock !== null && stock <= 0) {
      available = false;
      reason = "stok habis";
    }

    return {
      id: r.id,
      name: r.name,
      category: r.category?.trim() || "Token AI",
      source: r.source,
      tokens,
      validDays: r.valid_days,
      price: r.price,
      stock,
      soldCount: r.sold_count,
      available,
      reason,
    };
  });

  // yang tidak bisa dipesan turun ke bawah, urutan lain tetap dari SQL
  return [...list].sort((a, b) => Number(b.available) - Number(a.available));
}

/** Sisa kuota reseller (token) untuk ditampilkan; null = gagal dibaca. */
export async function getResellerQuotaTokens(): Promise<number | null> {
  return resellerQuotaTokens();
}
