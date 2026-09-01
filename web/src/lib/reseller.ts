import { cookies } from "next/headers";
import { API_URL, SESSION_COOKIE } from "./api";

const RESELLER_BASE = process.env.RESELLER_API_URL ?? "https://bandelbanget.xyz";
const KEY_FILE = process.env.RESELLER_KEY_FILE ?? "data/reseller.json";

export type ResellerQuota = {
  resellerId: string;
  quota: number;
  totalQuota: number;
  balance: number;
};

export type CustomerUsage = {
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  totalTokens: number;
  requests: number;
};

export type CustomerKey = {
  id: number;
  name: string;
  hashtag?: string | null;
  tag?: string | null;
  status: string;
  maxTokens: number;
  usedTokens: number;
  remainingTokens: number;
  usagePercent: number;
  usage?: CustomerUsage | null;
  validDays?: number;
  expiresAt?: string | null;
  createdAt?: string | null;
  secretToken?: string | null;
  dashboardUrl?: string | null;
};

export type CustomerKeyList = {
  object: string;
  data: CustomerKey[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreatedCustomerKey = {
  id: number;
  name: string;
  key: string;
  maxTokens: number;
  validDays: number;
  remainingQuota: number;
  dashboardUrl: string;
};

export type TopupTier = { id: string; label: string; tokens: number; validDays: number };

export type BandelModel = {
  id: string;
  object: string;
  multiplier: number;
  grade: string;
  vision: boolean;
};

export type ModelList = { object: string; data: BandelModel[] };

export type ModelUsage = { model: string; multiplier: number; successRate: number };

export type CustomerModelUsage = { id: number; name: string; hashtag: string; models: ModelUsage[] };

export type UsageByModel = {
  period: string;
  label: string;
  start: string;
  end: string;
  byModel: ModelUsage[];
  byCustomer: CustomerModelUsage[];
};

export const USAGE_PERIODS: { id: string; label: string }[] = [
  { id: "today", label: "Hari ini" },
  { id: "yesterday", label: "Kemarin" },
  { id: "week", label: "7 hari" },
  { id: "month", label: "30 hari" },
];

export type TopupResult = {
  success: boolean;
  tier: TopupTier;
  customerKey: {
    id: number;
    hashtag: string;
    name: string;
    keyMasked: string;
    status: string;
    maxTokens: number;
    validDays: number;
    expiresAt: string;
  };
  remainingQuota: number;
};

/* ---------- key resolution: file override > env ---------- */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

async function readKeyFile(): Promise<string | null> {
  try {
    const raw = JSON.parse(await readFile(KEY_FILE, "utf8")) as { key?: unknown };
    return typeof raw.key === "string" && raw.key.startsWith("rsl_") ? raw.key : null;
  } catch {
    return null;
  }
}

async function writeKeyFile(key: string): Promise<void> {
  await mkdir(path.dirname(KEY_FILE), { recursive: true });
  await writeFile(KEY_FILE, JSON.stringify({ key }, null, 2) + "\n", { mode: 0o600 });
}

export async function getResellerKey(): Promise<{ key: string | null; source: "file" | "env" | "none" }> {
  const fromFile = await readKeyFile();
  if (fromFile) return { key: fromFile, source: "file" };
  const fromEnv = process.env.RESELLER_API_KEY;
  if (fromEnv) return { key: fromEnv, source: "env" };
  return { key: null, source: "none" };
}

export function maskKey(key: string): string {
  if (key.length <= 12) return key.slice(0, 4) + "…";
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

/* ---------- auth guard ---------- */

export async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { ok: false, status: 401, message: "belum login" };

  const me = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!me?.ok) return { ok: false, status: 401, message: "sesi tidak valid" };

  const profile = (await me.json().catch(() => null)) as { role?: string } | null;
  if (profile?.role !== "admin") return { ok: false, status: 403, message: "akses ditolak" };
  return { ok: true };
}

/* ---------- bandel API client ---------- */

async function resellerFetch(path: string, init?: RequestInit): Promise<{ status: number; data: unknown; error: string | null }> {
  const { key } = await getResellerKey();
  if (!key) return { status: 500, data: null, error: "RESELLER_API_KEY belum dikonfigurasi." };

  const res = await fetch(`${RESELLER_BASE}/api/reseller/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);

  if (!res) return { status: 502, data: null, error: "bandelbanget.xyz tidak dapat dihubungi." };

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Reseller API error (HTTP ${res.status}).`;
    return { status: res.status, data: null, error: msg };
  }
  return { status: 200, data, error: null };
}

/* ---------- endpoints ---------- */

export async function getResellerQuota(): Promise<{ status: number; data: ResellerQuota | null; error: string | null }> {
  const r = await resellerFetch("/quota");
  if (!r.data) return { status: r.status, data: null, error: r.error };
  const d = r.data as ResellerQuota;
  if (typeof d.quota !== "number" || typeof d.totalQuota !== "number") {
    return { status: 502, data: null, error: "Respons reseller API tidak valid." };
  }
  return { status: 200, data: d, error: null };
}

export async function listCustomerKeys(opts: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ status: number; data: CustomerKeyList | null; error: string | null }> {
  const limit = Math.min(Math.max(1, opts.limit ?? 20), 200);
  const page = Math.max(1, opts.page ?? 1);
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (opts.search) params.set("search", opts.search);

  const r = await resellerFetch(`/customer-keys?${params}`);
  if (!r.data) return { status: r.status, data: null, error: r.error };
  return { status: 200, data: r.data as CustomerKeyList, error: null };
}

export async function getCustomerKey(
  id: number
): Promise<{ status: number; data: CustomerKey | null; error: string | null }> {
  const r = await resellerFetch(`/customer-keys/${id}`);
  if (!r.data) return { status: r.status, data: null, error: r.error };
  return { status: 200, data: r.data as CustomerKey, error: null };
}

export async function createCustomerKey(body: {
  name: string;
  maxTokens: number;
  validDays: number;
}): Promise<{ status: number; data: CreatedCustomerKey | null; error: string | null }> {
  const r = await resellerFetch("/customer-keys", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!r.data) return { status: r.status, data: null, error: r.error };
  return { status: 200, data: r.data as CreatedCustomerKey, error: null };
}

export async function topupCustomerKey(
  hashtag: string,
  tierId: string
): Promise<{ status: number; data: TopupResult | null; error: string | null }> {
  const r = await resellerFetch("/customer-keys/topup", {
    method: "POST",
    body: JSON.stringify({ hashtag, tierId }),
  });
  if (!r.data) return { status: r.status, data: null, error: r.error };
  return { status: 200, data: r.data as TopupResult, error: null };
}

export async function listModels(): Promise<{ status: number; data: ModelList | null; error: string | null }> {
  const r = await resellerFetch("/models");
  if (!r.data) return { status: r.status, data: null, error: r.error };
  return { status: 200, data: r.data as ModelList, error: null };
}

export async function usageByModel(
  period: string,
  customerId?: number
): Promise<{ status: number; data: UsageByModel | null; error: string | null }> {
  const params = new URLSearchParams({ period });
  if (customerId) params.set("customerId", String(customerId));
  const r = await resellerFetch(`/usage-by-model?${params}`);
  if (!r.data) return { status: r.status, data: null, error: r.error };
  return { status: 200, data: r.data as UsageByModel, error: null };
}

export async function setResellerApiKey(
  newKey: string
): Promise<{ status: number; data: ResellerQuota | null; error: string | null }> {
  if (!newKey.startsWith("rsl_") || newKey.length < 20) {
    return { status: 400, data: null, error: "Format key tidak valid — harus diawali rsl_." };
  }

  const res = await fetch(`${RESELLER_BASE}/api/reseller/v1/quota`, {
    headers: { Authorization: `Bearer ${newKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);

  if (!res) return { status: 502, data: null, error: "bandelbanget.xyz tidak dapat dihubungi." };
  if (!res.ok) {
    return { status: 400, data: null, error: `Key ditolak oleh bandelbanget.xyz (HTTP ${res.status}).` };
  }

  const quota = (await res.json().catch(() => null)) as ResellerQuota | null;
  if (!quota || typeof quota.resellerId !== "string") {
    return { status: 400, data: null, error: "Key tidak valid — respons quota tidak dikenal." };
  }

  await writeKeyFile(newKey);
  return { status: 200, data: quota, error: null };
}
