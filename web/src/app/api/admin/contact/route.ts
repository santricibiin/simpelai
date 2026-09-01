import { NextResponse } from "next/server";
import { getContact, setContact } from "@/lib/contact";
import { requireAdmin } from "@/lib/reseller";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  return NextResponse.json(await getContact());
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

  const { telegram, whatsapp } = (body ?? {}) as { telegram?: unknown; whatsapp?: unknown };

  const tele = typeof telegram === "string" ? telegram.trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "") : "";
  if (tele && !/^[A-Za-z0-9_]{4,32}$/.test(tele)) {
    return NextResponse.json({ error: "Username Telegram tidak valid (4-32 karakter, huruf/angka/underscore)." }, { status: 400 });
  }

  const wa = typeof whatsapp === "string" ? whatsapp.trim().replace(/\D/g, "") : "";
  if (wa && (wa.length < 8 || wa.length > 15)) {
    return NextResponse.json({ error: "Nomor WhatsApp tidak valid (8-15 digit, sertakan kode negara tanpa +)." }, { status: 400 });
  }

  await setContact({ telegram: tele, whatsapp: wa });
  return NextResponse.json({ telegram: tele, whatsapp: wa });
}
