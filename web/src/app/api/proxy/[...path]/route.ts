import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_URL, SESSION_COOKIE } from "@/lib/api";

const ALLOWED = [
  /^\/api\/admin\/providers$/,
  /^\/api\/admin\/providers\/[0-9]+$/,
  /^\/api\/admin\/providers\/[0-9]+\/(test|keys|models)$/,
  /^\/api\/admin\/providers\/[0-9]+\/models\/[0-9]+$/,
  /^\/api\/keys$/,
  /^\/api\/keys\/[0-9]+$/,
  /^\/api\/admin\/logs$/,
];

async function forward(req: Request, method: string, path: string[]) {
  const target = `/${path.join("/")}`;
  const search = new URL(req.url).search;
  if (!ALLOWED.some((re) => re.test(target))) {
    return NextResponse.json({ error: "endpoint tidak diizinkan" }, { status: 404 });
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "belum login" }, { status: 401 });

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  let body: string | undefined;

  if (method === "POST" || method === "PATCH") {
    body = await req.text();
    if (body) headers["Content-Type"] = "application/json";
  }

  const upstream = await fetch(`${API_URL}${target}${search}`, { method, headers, body, cache: "no-store" }).catch(
    () => null,
  );

  if (!upstream) return NextResponse.json({ error: "gateway tidak dapat dihubungi" }, { status: 502 });
  if (upstream.status === 204) return new NextResponse(null, { status: 204 });

  const text = await upstream.text();
  return new NextResponse(text || "{}", {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: Request, { params }: Ctx) {
  return forward(req, "GET", (await params).path);
}

export async function POST(req: Request, { params }: Ctx) {
  return forward(req, "POST", (await params).path);
}

export async function PATCH(req: Request, { params }: Ctx) {
  return forward(req, "PATCH", (await params).path);
}

export async function DELETE(req: Request, { params }: Ctx) {
  return forward(req, "DELETE", (await params).path);
}
