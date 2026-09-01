import { getResellerKey } from "./reseller";

const BASE = process.env.RESELLER_API_URL ?? "https://bandelbanget.xyz";
const RESELLER_SECRET = () => process.env.RESELLER_SECRET ?? "6589ae919962973d43cde8e8d1275bb2c37b82d27f924a5123fe1e5a84485255";

export type QuotaMeta = {
  id: string | number;
  name?: string;
  status?: string;
  pinSet?: boolean;
  pinLockedUntil?: string | null;
  resellerPhone?: string | null;
  createdAt?: string | null;
};

export type QuotaData = {
  id: string | number;
  name: string;
  status: string;
  key: string;
  keyMasked: string;
  maxTokens: number;
  validDays: number | null;
  expiresAt: string | null;
  baseUrl: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cachedTokens: number;
    requests: number;
  };
  usageByModel: Record<string, { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; requests?: number }>;
  models: { id: string; enabled: boolean; vision: boolean; description?: string; multiplier: number; grade: string }[];
  modelMultipliers: Record<string, number>;
  resellerPhone: string | null;
};

export type ResellerKeyRow = {
  id: string | number;
  name?: string;
  keyMasked?: string;
  status?: string;
  maxTokens?: number;
  validDays?: number | null;
  expiresAt?: string | null;
  usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number; requests?: number };
  secretToken?: string;
  dashboardUrl?: string;
  pinSet?: boolean;
};

async function bandelPublic(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!res) return { ok: false as const, status: 502, data: null, error: "Upstream tidak dapat dihubungi." };
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string" ? (data as { error: string }).error : `Error HTTP ${res.status}.`;
    return { ok: false as const, status: res.status, data: null, error: msg };
  }
  return { ok: true as const, status: 200, data, error: null };
}

export async function fetchQuotaMeta(token: string) {
  const r = await bandelPublic(`/api/public/quota/${encodeURIComponent(token)}`);
  if (!r.ok || !r.data) return { status: r.status, data: null as QuotaMeta | null, error: r.error };
  return { status: 200, data: r.data as QuotaMeta, error: null };
}

export async function verifyPin(token: string, pin: string) {
  const r = await bandelPublic(`/api/public/quota/${encodeURIComponent(token)}/verify-pin`, {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
  if (!r.ok || !r.data) return { status: r.status, data: null as { accessToken: string } | null, error: r.error };
  const at = (r.data as { accessToken?: unknown }).accessToken;
  if (typeof at !== "string" || !at) return { status: 401, data: null, error: "PIN salah." };
  return { status: 200, data: { accessToken: at }, error: null };
}

export async function fetchQuotaData(token: string, accessToken: string) {
  const r = await bandelPublic(`/api/public/quota/${encodeURIComponent(token)}/data`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok || !r.data) return { status: r.status, data: null as QuotaData | null, error: r.error };
  return { status: 200, data: r.data as QuotaData, error: null };
}

export async function fetchResellerKeys(): Promise<{ status: number; keys: ResellerKeyRow[] | null; error: string | null }> {
  const r = await bandelPublic(`/api/public/reseller/keys?token=${RESELLER_SECRET()}`);
  if (!r.ok || !r.data) return { status: r.status, keys: null, error: r.error };
  const keys = (r.data as { keys?: unknown }).keys;
  if (!Array.isArray(keys)) return { status: 502, keys: null, error: "Respons keys tidak valid." };
  return { status: 200, keys: keys as ResellerKeyRow[], error: null };
}

export type CheckQuotaResult = {
  name: string;
  status: string;
  keyMasked: string;
  maxTokens: number;
  usedTokens: number;
  remainingTokens: number;
  expiresAt: string | null;
  validDays: number | null;
};

function matchKey(apiKey: string, row: ResellerKeyRow): boolean {
  const masked = (row.keyMasked || "").match(/^(.*?)(•+)(.*)$/);
  if (!masked || !masked[1] || !masked[3]) return false;
  return apiKey.startsWith(masked[1]) && apiKey.endsWith(masked[3]);
}

export async function checkQuotaByApiKey(
  apiKey: string
): Promise<{ status: number; data: CheckQuotaResult | null; error: string | null }> {
  const r = await fetchResellerKeys();
  if (!r.keys) return { status: r.status, data: null, error: r.error };

  const matches = r.keys.filter((row) => matchKey(apiKey, row));
  if (matches.length === 0) return { status: 404, data: null, error: "API key tidak ditemukan." };
  if (matches.length > 1) return { status: 409, data: null, error: "Beberapa key cocok — hubungi admin." };

  const row = matches[0];
  const maxTokens = Number(row.maxTokens || 0);
  const usedTokens = Number(row.usage?.total_tokens || 0);
  return {
    status: 200,
    data: {
      name: row.name || "-",
      status: row.status || "unknown",
      keyMasked: row.keyMasked || `${apiKey.slice(0, 6)}••••${apiKey.slice(-4)}`,
      maxTokens,
      usedTokens,
      remainingTokens: Math.max(0, maxTokens - usedTokens),
      expiresAt: row.expiresAt ?? null,
      validDays: row.validDays ?? null,
    },
    error: null,
  };
}

export function baseUrlForRequest(req: Request): string {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0].trim();
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
