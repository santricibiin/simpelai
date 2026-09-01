import { query, execute, pool } from "./db";
import { getAppSetting, setAppSetting } from "./app-settings";
import { timingSafeEqual } from "node:crypto";

/* ---------- QRIS statis → dinamis (EMVCo TLV) ---------- */

type Tlv = { id: string; value: string };

function crc16CcittFalse(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function parseTlv(payload: string): Tlv[] {
  const out: Tlv[] = [];
  let i = 0;
  while (i + 4 <= payload.length) {
    const id = payload.slice(i, i + 2);
    const len = Number.parseInt(payload.slice(i + 2, i + 4), 10);
    if (!Number.isFinite(len) || len < 0) throw new Error(`bad TLV length at ${i}`);
    const value = payload.slice(i + 4, i + 4 + len);
    if (value.length !== len) throw new Error(`truncated TLV tag ${id}`);
    out.push({ id, value });
    i += 4 + len;
  }
  if (i !== payload.length) throw new Error("trailing garbage in QRIS");
  return out;
}

export function qrisStaticToDynamic(staticQris: string, amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
    throw new Error("amount must be positive integer rupiah");
  }
  const tags = parseTlv(staticQris.trim());
  if (!tags.find((t) => t.id === "63")) throw new Error("QRIS invalid: missing tag 63");

  let body = tags.filter((t) => t.id !== "63" && !["54", "55", "56", "57"].includes(t.id));
  body = body.map((t) => (t.id === "01" && t.value === "11" ? { id: "01", value: "12" } : t));

  const insert: Tlv[] = [{ id: "54", value: String(amount) }];
  const idx58 = body.findIndex((t) => t.id === "58");
  if (idx58 === -1) throw new Error("QRIS invalid: missing tag 58");
  body = [...body.slice(0, idx58), ...insert, ...body.slice(idx58)];

  const payload = body.map((t) => tlv(t.id, t.value)).join("") + "6304";
  return payload + crc16CcittFalse(payload);
}

export function verifyQrisCrc(qris: string): boolean {
  try {
    const s = qris.trim();
    const tags = parseTlv(s);
    const crc = tags.find((t) => t.id === "63");
    if (!crc || crc.value.length !== 4) return false;
    return crc16CcittFalse(s.slice(0, -4)) === crc.value.toUpperCase();
  } catch {
    return false;
  }
}

/* ---------- settings (app_settings key=payment) ---------- */

export type QrisProvider = "none" | "dana" | "neobank" | "gopay";

export type PaymentSettings = {
  qrisProvider: QrisProvider;
  qrisStatic: string;
  uniqueCodeEnabled: boolean;
  ttlMinutes: number;
  forwarderSecret: string;
  maxPendingOrders: number;
};

const DEFAULT_SETTINGS: PaymentSettings = {
  qrisProvider: "none",
  qrisStatic: "",
  uniqueCodeEnabled: true,
  ttlMinutes: 10,
  forwarderSecret: "",
  maxPendingOrders: 3,
};

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const raw = await getAppSetting<Partial<PaymentSettings>>("payment", {});
  return {
    qrisProvider: (["none", "dana", "neobank", "gopay"] as const).includes(raw.qrisProvider as QrisProvider)
      ? (raw.qrisProvider as QrisProvider)
      : DEFAULT_SETTINGS.qrisProvider,
    qrisStatic: typeof raw.qrisStatic === "string" ? raw.qrisStatic.trim() : "",
    uniqueCodeEnabled: typeof raw.uniqueCodeEnabled === "boolean" ? raw.uniqueCodeEnabled : DEFAULT_SETTINGS.uniqueCodeEnabled,
    ttlMinutes:
      typeof raw.ttlMinutes === "number" && raw.ttlMinutes >= 1 && raw.ttlMinutes <= 120
        ? Math.round(raw.ttlMinutes)
        : DEFAULT_SETTINGS.ttlMinutes,
    forwarderSecret: typeof raw.forwarderSecret === "string" ? raw.forwarderSecret.trim() : "",
    maxPendingOrders:
      typeof raw.maxPendingOrders === "number" && raw.maxPendingOrders >= 1 && raw.maxPendingOrders <= 10
        ? Math.round(raw.maxPendingOrders)
        : DEFAULT_SETTINGS.maxPendingOrders,
  };
}

export async function setPaymentSettings(s: PaymentSettings): Promise<void> {
  await setAppSetting("payment", s);
}

/* ---------- orders ---------- */

export type OrderStatus = "pending" | "paid" | "expired" | "failed";

export type PaymentOrder = {
  invoice: string;
  status: OrderStatus;
  amount: number;
  uniqueCode: number;
  productId: string | null;
  productName: string;
  tokens: number;
  validDays: number;
  source: "bandel" | "gateway" | "manual";
  tierId?: string | null;
  category?: string | null;
  productCode?: string | null;
  buyerToken: string | null;
  qty: number;
  qrisPayload: string | null;
  tg?: {
    userId: string | null;
    chatId: string | null;
    name: string | null;
    username: string | null;
    qrisMessageId: number | null;
  } | null;
  tgDelivered?: boolean;
  eventId?: string | null;
  delivered?: string | null;
  createdAt: string;
  expiresAt: string;
  paidAt?: string | null;
};

interface OrderRow {
  invoice: string;
  status: OrderStatus;
  amount: number;
  unique_code: number;
  product_id: string | null;
  product_name: string;
  tokens: number;
  valid_days: number;
  source: PaymentOrder["source"];
  tier_id: string | null;
  category: string | null;
  product_code: string | null;
  buyer_token: string | null;
  qty: number;
  qris_payload: string | null;
  tg_user_id: string | null;
  tg_chat_id: string | null;
  tg_name: string | null;
  tg_username: string | null;
  tg_qris_message_id: number | null;
  tg_delivered: number;
  event_id: string | null;
  delivered: string | null;
  created_at: Date;
  expires_at: Date;
  paid_at: Date | null;
}

function mapOrder(r: OrderRow): PaymentOrder {
  const hasTg = r.tg_user_id !== null;
  return {
    invoice: r.invoice,
    status: r.status,
    amount: r.amount,
    uniqueCode: r.unique_code,
    productId: r.product_id,
    productName: r.product_name,
    tokens: Number(r.tokens),
    validDays: r.valid_days,
    source: r.source,
    tierId: r.tier_id ?? undefined,
    category: r.category ?? undefined,
    productCode: r.product_code ?? undefined,
    buyerToken: r.buyer_token,
    qty: r.qty,
    qrisPayload: r.qris_payload,
    tg: hasTg
      ? {
          userId: r.tg_user_id,
          chatId: r.tg_chat_id,
          name: r.tg_name,
          username: r.tg_username,
          qrisMessageId: r.tg_qris_message_id,
        }
      : null,
    tgDelivered: Boolean(r.tg_delivered),
    eventId: r.event_id ?? undefined,
    delivered: r.delivered ?? undefined,
    createdAt: new Date(r.created_at).toISOString(),
    expiresAt: new Date(r.expires_at).toISOString(),
    paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
  };
}

export function invoiceCode(): string {
  return `INV${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export type NewOrder = {
  amount: number;
  productId: string;
  productName: string;
  tokens: number;
  validDays: number;
  source: PaymentOrder["source"];
  tierId?: string | null;
  category?: string | null;
  productCode?: string | null;
  buyerToken?: string | null;
  qty?: number;
  qrisPayload?: string;
  tg?: PaymentOrder["tg"];
};

export async function createOrder(
  input: NewOrder
): Promise<{ ok: true; order: PaymentOrder } | { ok: false; error: string }> {
  const settings = await getPaymentSettings();
  if (settings.qrisProvider === "none" || !settings.qrisStatic) {
    return { ok: false, error: "Pembayaran QRIS belum aktif. Hubungi admin." };
  }

  const now = new Date();
  let amount = input.amount;
  let uniqueCode = 0;

  if (settings.uniqueCodeEnabled) {
    const pending = await query<{ amount: number }>(
      "SELECT amount FROM payment_orders WHERE status = 'pending' AND expires_at > NOW()",
      []
    );
    const used = new Set(pending.map((p) => p.amount));
    for (let i = 0; i < 80; i++) {
      const unik = Math.floor(Math.random() * 900) + 100;
      const candidate = amount + unik;
      if (!used.has(candidate)) {
        amount = candidate;
        uniqueCode = unik;
        break;
      }
    }
    if (uniqueCode === 0) return { ok: false, error: "Nominal pembayaran sedang penuh. Coba lagi." };
  }

  let qrisPayload: string;
  try {
    qrisPayload = qrisStaticToDynamic(settings.qrisStatic, amount);
  } catch {
    return { ok: false, error: "QRIS statis tidak valid. Hubungi admin." };
  }

  const ttlMinutes = settings.ttlMinutes;
  const invoice = invoiceCode();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000);

  await execute(
    `INSERT INTO payment_orders
     (invoice, status, amount, unique_code, product_id, product_name, tokens, valid_days, source, tier_id, category, product_code, buyer_token, qty, qris_payload, tg_user_id, tg_chat_id, tg_name, tg_username, expires_at)
     VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invoice, amount, uniqueCode, input.productId, input.productName, input.tokens, input.validDays,
      input.source, input.tierId ?? null, input.category ?? null, input.productCode ?? null,
      input.buyerToken ?? null, input.qty ?? 1, qrisPayload,
      input.tg?.userId ?? null, input.tg?.chatId ?? null, input.tg?.name ?? null, input.tg?.username ?? null,
      expiresAt,
    ]
  );

  const rows = await query<OrderRow>("SELECT * FROM payment_orders WHERE invoice = ?", [invoice]);
  return { ok: true, order: mapOrder(rows[0]) };
}

export async function getOrderByInvoice(invoice: string): Promise<PaymentOrder | null> {
  const rows = await query<OrderRow>("SELECT * FROM payment_orders WHERE invoice = ?", [invoice]);
  return rows.length ? mapOrder(rows[0]) : null;
}

export async function listOrders(limit = 50): Promise<PaymentOrder[]> {
  const rows = await query<OrderRow>("SELECT * FROM payment_orders ORDER BY created_at DESC LIMIT ?", [limit]);
  return rows.map(mapOrder);
}

export async function listOrdersByToken(
  buyerToken: string,
  page = 1,
  limit = 5
): Promise<{ orders: PaymentOrder[]; total: number; page: number; totalPages: number; pendingCount: number }> {
  const [countRows, pendingRows] = await Promise.all([
    query<{ n: number }>("SELECT COUNT(*) AS n FROM payment_orders WHERE buyer_token = ?", [buyerToken]),
    query<{ n: number }>(
      "SELECT COUNT(*) AS n FROM payment_orders WHERE buyer_token = ? AND status = 'pending' AND expires_at > NOW()",
      [buyerToken]
    ),
  ]);
  const total = Number(countRows[0]?.n ?? 0);
  const pendingCount = Number(pendingRows[0]?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const rows = await query<OrderRow>(
    "SELECT * FROM payment_orders WHERE buyer_token = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [buyerToken, limit, (safePage - 1) * limit]
  );
  return { orders: rows.map(mapOrder), total, page: safePage, totalPages, pendingCount };
}

export async function countPendingByToken(buyerToken: string): Promise<number> {
  const rows = await query<{ n: number }>(
    "SELECT COUNT(*) AS n FROM payment_orders WHERE buyer_token = ? AND status = 'pending' AND expires_at > NOW()",
    [buyerToken]
  );
  return Number(rows[0]?.n ?? 0);
}

const EXPIRE_GRACE_MS = 10 * 60 * 1000;

/** Expire order pending lewat TTL + grace. */
export async function expireOverdue(): Promise<void> {
  await execute(
    `UPDATE payment_orders SET status = 'expired' WHERE status = 'pending' AND expires_at <= (NOW() - INTERVAL 10 MINUTE)`
  );
}

export async function cancelOrder(invoice: string): Promise<boolean> {
  const r = await execute("UPDATE payment_orders SET status = 'expired' WHERE invoice = ? AND status = 'pending'", [invoice]);
  return r.affectedRows === 1;
}

/* ---------- notification parser ---------- */

export type ParsedPayment = {
  provider: "neobank" | "dana" | "gopay" | "unknown";
  amount: number | null;
  isPayment: boolean;
};

const PKG_PROVIDER: Record<string, ParsedPayment["provider"]> = {
  "com.bnc.finance": "neobank",
  "id.dana": "dana",
  "com.gojek.gopay": "gopay",
  "com.gojek.gopay.ais": "gopay",
  "com.gojek.app": "gopay",
};

function parseRupiahAmount(text: string): number | null {
  const m = text.match(/Rp\s*([\d.,]+)/i);
  if (!m) return null;
  let s = m[1];
  const commaIdx = s.lastIndexOf(",");
  if (commaIdx !== -1) {
    const decimals = s.slice(commaIdx + 1);
    if (decimals.length > 0 && decimals.length <= 2 && /^\d+$/.test(decimals)) s = s.slice(0, commaIdx);
    else s = s.replace(/,/g, "");
  }
  const n = Number.parseInt(s.replace(/\./g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parsePaymentNotification(body: Record<string, unknown>): ParsedPayment {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const text = str(body.text) ?? str(body.bigtext) ?? str(body.title) ?? "";
  const bigtext = str(body.bigtext);
  const title = str(body.title);
  const name = str(body.name);
  const pkg = str(body.pkg) ?? "unknown";
  const combined = [text, bigtext, title].filter(Boolean).join("\n");

  const provider: ParsedPayment["provider"] = PKG_PROVIDER[pkg] ?? (name?.toLowerCase().includes("dana") ? "dana" : name?.toLowerCase().includes("gopay") ? "gopay" : name && /neo|bnc/i.test(name) ? "neobank" : "unknown");

  let isPayment = false;
  if (provider === "neobank") {
    const agg = (title ?? "").match(/menerima\s+(\d+)\s+pembayaran/i);
    if (!(agg && Number(agg[1]) > 1)) {
      isPayment =
        /pembayaran\s+qris\s+diterima/i.test(combined) ||
        /menerima\s+\d+\s+pembayaran/i.test(title ?? "") ||
        /akan\s+dikreditkan/i.test(combined);
    }
  } else if (provider === "dana" || provider === "gopay") {
    isPayment =
      /pembayaran\s+masuk/i.test(title ?? "") ||
      /diterima\s+dana/i.test(combined) ||
      /rp\s*[\d.,]+\s+diterima/i.test(combined) ||
      /berhasil\s+(dibayar|masuk)/i.test(combined);
  } else {
    isPayment = parseRupiahAmount(combined) != null;
  }

  return { provider, amount: parseRupiahAmount(combined), isPayment };
}

export function makeEventKey(body: Record<string, unknown>): string {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");
  if (str(body.eventId)) return str(body.eventId);
  return `${str(body.pkg)}|${str(body.title)}|${str(body.text)}|${Number.isFinite(Number(body.postedAt)) ? String(body.postedAt) : String(Date.now())}`;
}

/* ---------- match event → order + fulfill ---------- */

export async function processPaymentCallback(
  body: Record<string, unknown>,
  secret: string
): Promise<{ ok: boolean; status: number; result?: { matched: boolean; invoice?: string; fulfilled?: string | null }; error?: string }> {
  const settings = await getPaymentSettings();

  const bodySecret =
    (typeof body.secret === "string" ? body.secret : undefined) ??
    (typeof body.additionalParam1 === "string" ? body.additionalParam1 : undefined) ??
    (typeof body.param1 === "string" ? body.param1 : undefined);

  const secrets = [process.env.PAYMENT_FORWARD_SECRET?.trim(), settings.forwarderSecret || secret].filter(
    (s): s is string => Boolean(s && s.length)
  );
  if (secrets.length === 0) {
    return { ok: false, status: 403, error: "callback secret not configured" };
  }

  const authorized = secrets.some(
    (s) =>
      bodySecret !== undefined &&
      bodySecret.length === s.length &&
      timingSafeEqual(Buffer.from(bodySecret), Buffer.from(s))
  );
  if (!authorized) return { ok: false, status: 401, error: "unauthorized" };

  delete body.secret;
  delete body.forwardSecret;
  delete body.additionalParam1;
  delete body.param1;

  const parsed = parsePaymentNotification(body);
  if (!parsed.isPayment || parsed.amount == null) {
    return { ok: true, status: 200, result: { matched: false } };
  }

  const eventKey = makeEventKey(body);

  // dedupe + claim atomic
  const claimed = await claimPaymentEvent(eventKey, parsed.amount);
  if (!claimed) {
    return { ok: true, status: 200, result: { matched: false } };
  }

  const fulfilled = await fulfillOrder(claimed.invoice);
  return { ok: true, status: 200, result: { matched: true, invoice: claimed.invoice, fulfilled } };
}

/** Claim: insert event, lalu tandai order pending yang cocok jadi paid (atomic). */
async function claimPaymentEvent(eventKey: string, amount: number): Promise<{ invoice: string } | null> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // dedupe
    const [existing] = await conn.query("SELECT id, matched FROM payment_events WHERE event_key = ? FOR UPDATE", [eventKey]);
    const rows = existing as { id: number; matched: number }[];
    if (rows.length > 0 && rows[0].matched === 1) {
      await conn.rollback();
      return null;
    }
    if (rows.length === 0) {
      await conn.query("INSERT INTO payment_events (event_key, amount, matched) VALUES (?, ?, 0)", [eventKey, amount]);
    }

    // match order: pending + amount sama + belum lewat grace
    const [candidates] = await conn.query(
      `SELECT invoice FROM payment_orders
       WHERE status = 'pending' AND amount = ? AND event_id IS NULL
         AND expires_at > (NOW() - INTERVAL 10 MINUTE)
       ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
      [amount]
    );
    const cand = candidates as { invoice: string }[];
    if (cand.length === 0) {
      await conn.commit();
      return null;
    }

    const invoice = cand[0].invoice;
    await conn.query("UPDATE payment_orders SET status = 'paid', paid_at = NOW(), event_id = ? WHERE invoice = ?", [
      eventKey,
      invoice,
    ]);
    await conn.query("UPDATE payment_events SET matched = 1 WHERE event_key = ?", [eventKey]);
    await conn.commit();
    return { invoice };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/** Fulfillment: tambah kuota bandel ke member (order web) setelah paid. Idempoten. */
export async function fulfillOrder(invoice: string): Promise<string | null> {
  const orders = await query<OrderRow>("SELECT * FROM payment_orders WHERE invoice = ?", [invoice]);
  if (orders.length === 0) return null;
  const order = mapOrder(orders[0]);
  if (order.delivered) return order.delivered;
  if (order.status !== "paid") return null;
  // order telegram / tanpa buyerToken: delivery ditangani proses bot telegram
  if (!order.buyerToken) return null;

  const { addCustomerQuotaByToken } = await import("./member-quota");
  const r = await addCustomerQuotaByToken(order.buyerToken, order.tokens, order.validDays);

  const delivered = r.ok
    ? `+${order.tokens.toLocaleString("id-ID")} token → ${r.memberName ?? "member"} (sisa reseller: ${r.remainingQuota?.toLocaleString("id-ID") ?? "?"})`
    : null;

  if (r.ok) {
    await execute("UPDATE payment_orders SET delivered = ? WHERE invoice = ?", [
      delivered ?? `+${order.tokens} token`,
      invoice,
    ]);
  }
  return delivered;
}
