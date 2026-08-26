import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_URL, SESSION_COOKIE } from "@/lib/api";

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "belum login" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body harus JSON" }, { status: 400 });
  }

  const { site_name, site_tagline } = (body ?? {}) as { site_name?: unknown; site_tagline?: unknown };
  if (typeof site_name !== "string" || !site_name.trim()) {
    return NextResponse.json({ error: "nama website wajib diisi" }, { status: 400 });
  }

  const upstream = await fetch(`${API_URL}/api/admin/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      site_name: site_name.trim(),
      site_tagline: typeof site_tagline === "string" ? site_tagline.trim() : "",
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!upstream) return NextResponse.json({ error: "gateway tidak dapat dihubungi" }, { status: 502 });

  const data = await upstream.json().catch(() => ({ error: "respons tidak valid" }));
  return NextResponse.json(data, { status: upstream.status });
}
