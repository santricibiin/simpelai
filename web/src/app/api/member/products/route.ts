import { NextResponse } from "next/server";
import { getProducts } from "@/lib/products";
import { getContact } from "@/lib/contact";
import { getResellerQuotaTokens } from "@/lib/member-quota";
import { countPendingByToken, getPaymentSettings } from "@/lib/payment";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";

  const [products, contact, resellerQuota, pendingCount, settings] = await Promise.all([
    getProducts(),
    getContact(),
    getResellerQuotaTokens().catch(() => null),
    /^[a-fA-F0-9]{16,128}$/.test(token) ? countPendingByToken(token) : Promise.resolve(0),
    getPaymentSettings(),
  ]);

  return NextResponse.json({
    resellerQuota,
    pendingCount,
    maxPendingOrders: settings.maxPendingOrders,
    products: products
      .filter((p) => p.enabled)
      .map((p) => ({
        id: p.id,
        name: p.name,
        source: p.source,
        tokens: p.tokens,
        validDays: p.validDays,
        price: p.price,
        soldOut: p.source === "bandel" && resellerQuota !== null ? p.tokens > resellerQuota : false,
      })),
    contact: { telegram: contact.telegram || null, whatsapp: contact.whatsapp || null },
  });
}
