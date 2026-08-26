export type Profile = { id: number; email: string; name: string; role: "admin" | "member" };

export type SeriesPoint = { day: string; tokens: number; requests: number; revenue_cents: number };

export type AdminStats = {
  kpis: {
    tokens_30d: number;
    requests_30d: number;
    revenue_cents_30d: number;
    total_users: number;
    active_users: number;
  };
  series: SeriesPoint[];
  by_model: { model: string; tokens: number }[];
  recent_users: { id: number; email: string; name: string; role: string; is_active: number }[];
};

export type Settings = { site_name: string; site_tagline: string };

export type ProviderKey = { id: number; provider_id: number; label: string; key_hint: string; enabled: number };

export type ProviderModel = { id: number; provider_id: number; model: string; enabled: number };

export type Provider = {
  id: number;
  name: string;
  slug: string;
  base_url: string;
  enabled: number;
  priority: number;
  models: string[] | null;
  model_list: ProviderModel[];
  last_error: string | null;
  keys: ProviderKey[];
};

export type PlatformKey = {
  id: number;
  name: string;
  key_prefix: string;
  revoked: number;
  rpm_limit: number;
  tokens_used: number;
  tokens_in: number;
  tokens_out: number;
  token_quota: number | null;
  requests: number;
  avg_latency_ms: number;
};

export type LogRow = {
  id: number;
  created_at: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  status_code: number;
  key_name: string | null;
  key_prefix: string | null;
  user_email: string | null;
  provider_name: string | null;
};

export type LogsResponse = {
  stats: { total: number; failed: number; tokens: number; p50_ms: number; p95_ms: number; avg_ms: number };
  rows: LogRow[];
};

export const API_URL = process.env.API_URL ?? "http://localhost:8080";
export const SESSION_COOKIE = "nf_session";

export const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
