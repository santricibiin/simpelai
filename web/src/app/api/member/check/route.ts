import { NextResponse } from "next/server";
import { checkQuotaByApiKey } from "@/lib/member-quota";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON" }, { status: 400 });
  }

  const apiKey = (body as { apiKey?: unknown })?.apiKey;
  if (typeof apiKey !== "string" || apiKey.trim().length < 12 || !apiKey.startsWith("sk-")) {
    return NextResponse.json({ error: "Format API key tidak valid — harus diawali sk-." }, { status: 400 });
  }

  const { status, data, error } = await checkQuotaByApiKey(apiKey.trim());
  if (!data) return NextResponse.json({ error: error ?? "Gagal mengecek kuota." }, { status });
  return NextResponse.json(data);
}
