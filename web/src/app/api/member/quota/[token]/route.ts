import { NextResponse } from "next/server";
import { fetchQuotaMeta, verifyPin, fetchQuotaData } from "@/lib/member-quota";

export const dynamic = "force-dynamic";

const TOKEN_RE = /^[a-fA-F0-9]{16,128}$/;

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) return bad("Token tidak valid.");

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "data") {
    const at = req.headers.get("x-access-token");
    if (!at) return bad("Access token hilang.", 401);
    const r = await fetchQuotaData(token, at);
    if (!r.data) {
      if (r.status === 401) return bad(r.error ?? "Sesi berakhir — buka kunci lagi.", 401);
      return bad(r.error ?? "Gagal memuat data.", r.status);
    }
    return NextResponse.json(r.data);
  }

  const meta = await fetchQuotaMeta(token);
  if (!meta.data) {
    if (meta.status === 404) return bad("Dashboard tidak ditemukan.", 404);
    return bad(meta.error ?? "Gagal memuat dashboard.", meta.status);
  }
  return NextResponse.json(meta.data);
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) return bad("Token tidak valid.");

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "verify-pin") {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return bad("Body harus JSON.");
    }
    const pin = (body as { pin?: unknown })?.pin;
    if (typeof pin !== "string" || !/^\d{6}$/.test(pin)) return bad("PIN harus 6 digit.");

    const r = await verifyPin(token, pin);
    if (!r.data) {
      if (r.status === 401) return bad(r.error ?? "PIN salah.", 401);
      return bad(r.error ?? "Gagal verifikasi PIN.", r.status);
    }
    return NextResponse.json(r.data);
  }

  return bad("Aksi tidak dikenal.");
}
