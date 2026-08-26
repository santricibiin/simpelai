import { NextResponse } from "next/server";
import { API_URL, SESSION_COOKIE } from "@/lib/api";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body harus JSON" }, { status: 400 });
  }

  const { email, password } = (body ?? {}) as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return NextResponse.json({ error: "email dan password wajib diisi" }, { status: 400 });
  }

  const upstream = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
    cache: "no-store",
  }).catch(() => null);

  if (!upstream) return NextResponse.json({ error: "gateway tidak dapat dihubungi" }, { status: 502 });

  const data = await upstream.json().catch(() => ({ error: "respons tidak valid" }));
  if (!upstream.ok) return NextResponse.json(data, { status: upstream.status });

  const res = NextResponse.json({ user: data.user });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: data.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: data.expires_in,
  });
  return res;
}
