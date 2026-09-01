import { NextResponse } from "next/server";
import { listOrdersByToken } from "@/lib/payment";

export const dynamic = "force-dynamic";

const TOKEN_RE = /^[a-fA-F0-9]{16,128}$/;

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: "Token tidak valid." }, { status: 400 });

  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Math.min(Math.max(1, Number(url.searchParams.get("limit") ?? "5") || 5), 20);

  const result = await listOrdersByToken(token, Number.isFinite(page) ? page : 1, limit);
  return NextResponse.json(result);
}
