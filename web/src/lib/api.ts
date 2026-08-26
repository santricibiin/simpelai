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

export const API_URL = process.env.API_URL ?? "http://localhost:8080";
export const SESSION_COOKIE = "nf_session";

export const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
