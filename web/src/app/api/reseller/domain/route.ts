import { NextResponse } from "next/server";
import { getBandelDomain, setBandelDomain } from "@/lib/bandel-domain";
import { requireAdmin } from "@/lib/reseller";

export const maxDuration = 120;

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  return NextResponse.json({ domain: await getBandelDomain() });
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

  const domain = (body as { domain?: unknown })?.domain;
  if (typeof domain !== "string" || !domain.trim()) {
    return NextResponse.json({ error: "domain wajib diisi" }, { status: 400 });
  }

  const result = await setBandelDomain(domain);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ domain: result.domain, changed: result.changed });
}
