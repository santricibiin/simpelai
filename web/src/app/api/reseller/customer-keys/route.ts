import { NextResponse } from "next/server";
import { createCustomerKey, listCustomerKeys, requireAdmin } from "@/lib/reseller";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "20");

  const { status, data, error } = await listCustomerKeys({
    search: search || undefined,
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 20,
  });
  if (!data) return NextResponse.json({ error: error ?? "gagal memuat daftar" }, { status });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "body harus JSON" }, { status: 400 });
  }

  const { name, maxTokens, validDays } = (body ?? {}) as {
    name?: unknown;
    maxTokens?: unknown;
    validDays?: unknown;
  };

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "nama customer wajib diisi" }, { status: 400 });
  }
  if (typeof maxTokens !== "number" || !Number.isInteger(maxTokens) || maxTokens < 5_000_000) {
    return NextResponse.json({ error: "maxTokens minimal 5.000.000" }, { status: 400 });
  }
  if (![7, 14, 21, 28].includes(validDays as number)) {
    return NextResponse.json({ error: "validDays harus 7, 14, 21, atau 28 hari" }, { status: 400 });
  }

  const { status, data, error } = await createCustomerKey({
    name: name.trim(),
    maxTokens,
    validDays: validDays as number,
  });
  if (!data) return NextResponse.json({ error: error ?? "gagal membuat key" }, { status });
  return NextResponse.json(data);
}
