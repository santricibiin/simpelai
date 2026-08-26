import { cookies } from "next/headers";
import { API_URL, SESSION_COOKIE, type AdminStats, type Profile, type Settings } from "./api";

const FALLBACK_SETTINGS: Settings = { site_name: "NeuroForge", site_tagline: "LLM API Token Platform" };

export async function getSettings(): Promise<Settings> {
  const res = await fetch(`${API_URL}/api/settings`, { cache: "no-store" }).catch(() => null);
  if (!res?.ok) return FALLBACK_SETTINGS;
  return (await res.json().catch(() => FALLBACK_SETTINGS)) as Settings;
}

async function authFetch(path: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { status: 401 as const, data: null };

  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return { status: res.status, data: null };
  return { status: res.status, data: await res.json() };
}

export const getProfile = () => authFetch("/api/auth/me") as Promise<{ status: number; data: Profile | null }>;

export const getAdminStats = () =>
  authFetch("/api/admin/stats") as Promise<{ status: number; data: AdminStats | null }>;
