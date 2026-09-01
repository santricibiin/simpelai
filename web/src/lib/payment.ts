import { promises as fs } from "node:fs";
import path from "node:path";
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

/* ---------- settings ---------- */

const SETTINGS_FILE = "data/payment-settings.json";
const ORDERS_FILE = "data/payment-orders.json";
const EVENTS_FILE = "data/payment-events.json";

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
  try {
    const raw = JSON.parse(await fs.readFile(SETTINGS_FILE, "utf8")) as Partial<PaymentSettings>;
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
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function setPaymentSettings(s: PaymentSettings): Promise<void> {
  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(s, null, 2) + "\n", { mode: 0o600 });
}

/* ---------- orders ---------- */

export type OrderStatus = "pending" | "paid" | "expired" | "failed";

export type PaymentOrder = {
  invoice: string;
  status: OrderStatus;
  amount: number;
  uniqueCode: number;
  productId: string;
  productName: string;
  tokens: number;
  validDays: number;
  source: "bandel" | "gateway";
  tierId?: string;
  buyerToken: string;
  qrisPayload: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  delivered?: string;
  eventId?: string;
};

async function readOrders(): Promise<PaymentOrder[]> {
  try {
    const raw = JSON.parse(await fs.readFile(ORDERS_FILE, "utf8")) as unknown;
    return Array.isArray(raw) ? (raw as PaymentOrder[]) : [];
  } catch {
    return [];
  }
}

async function writeOrders(list: PaymentOrder[]): Promise<void> {
  await fs.mkdir(path.dirname(ORDERS_FILE), { recursive: true });
  await fs.writeFile(ORDERS_FILE, JSON.stringify(list, null, 2) + "\n", { mode: 0o600 });
}

export function invoiceCode(): string {
  return `INV${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export async function createOrder(input: Omit<PaymentOrder, "invoice" | "status" | "qrisPayload" | "createdAt" | "expiresAt" | "uniqueCode">): Promise<
  { ok: true; order: PaymentOrder } | { ok: false; error: string }
> {
  const settings = await getPaymentSettings();
  if (settings.qrisProvider === "none" || !settings.qrisStatic) {
    return { ok: false, error: "Pembayaran QRIS belum aktif. Hubungi admin." };
  }

  const orders = await readOrders();
  const now = new Date();

  let amount = input.amount;
  let uniqueCode = 0;
  if (settings.uniqueCodeEnabled) {
    for (let i = 0; i < 80; i++) {
      const unik = Math.floor(Math.random() * 900) + 100;
      const candidate = amount + unik;
      const clash = orders.some(
        (o) => o.status === "pending" && o.amount === candidate && new Date(o.expiresAt).getTime() > now.getTime()
      );
      if (!clash) {
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
  const order: PaymentOrder = {
    ...input,
    amount,
    uniqueCode,
    invoice: invoiceCode(),
    status: "pending",
    qrisPayload,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMinutes * 60_000).toISOString(),
  };

  orders.push(order);
  await writeOrders(orders);
  return { ok: true, order };
}

export async function getOrderByInvoice(invoice: string): Promise<PaymentOrder | null> {
  const orders = await readOrders();
  return orders.find((o) => o.invoice === invoice) ?? null;
}

export async function listOrders(limit = 50): Promise<PaymentOrder[]> {
  const orders = await readOrders();
  return orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
}

export async function listOrdersByToken(
  buyerToken: string,
  page = 1,
  limit = 5
): Promise<{ orders: PaymentOrder[]; total: number; page: number; totalPages: number; pendingCount: number }> {
  const all = (await readOrders())
    .filter((o) => o.buyerToken === buyerToken)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const now = Date.now();
  const pendingCount = all.filter(
    (o) => o.status === "pending" && new Date(o.expiresAt).getTime() > now
  ).length;

  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const orders = all.slice((safePage - 1) * limit, safePage * limit);

  return { orders, total, page: safePage, totalPages, pendingCount };
}

export async function countPendingByToken(buyerToken: string): Promise<number> {
  const now = Date.now();
  const orders = await readOrders();
  return orders.filter(
    (o) => o.buyerToken === buyerToken && o.status === "pending" && new Date(o.expiresAt).getTime() > now
  ).length;
}

const EXPIRE_GRACE_MS = 10 * 60 * 1000;

/** Expire order pending yang sudah lewat TTL + grace. */
export async function expireOverdue(): Promise<void> {
  const orders = await readOrders();
  const cutoff = Date.now() - EXPIRE_GRACE_MS;
  let changed = false;
  for (const o of orders) {
    if (o.status === "pending" && new Date(o.expiresAt).getTime() <= cutoff) {
      o.status = "expired";
      changed = true;
    }
  }
  if (changed) await writeOrders(orders);
}

export async function cancelOrder(invoice: string): Promise<boolean> {
  const orders = await readOrders();
  const o = orders.find((x) => x.invoice === invoice && x.status === "pending");
  if (!o) return false;
  o.status = "expired";
  await writeOrders(orders);
  return true;
}

/* ---------- payment events (dedupe) ---------- */

type PaymentEvent = { eventKey: string; amount: number | null; createdAt: string; matched: boolean };

async function readEvents(): Promise<PaymentEvent[]> {
  try {
    const raw = JSON.parse(await fs.readFile(EVENTS_FILE, "utf8")) as unknown;
    return Array.isArray(raw) ? (raw as PaymentEvent[]) : [];
  } catch {
    return [];
  }
}

async function writeEvents(list: PaymentEvent[]): Promise<void> {
  await fs.mkdir(path.dirname(EVENTS_FILE), { recursive: true });
  await fs.writeFile(EVENTS_FILE, JSON.stringify(list.slice(-500), null, 2) + "\n", { mode: 0o600 });
}

/* ---------- notification parser (Android forwarder) ---------- */

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

/** Claim: atomic-ish match event amount ke order pending. */
async function claimPaymentEvent(eventKey: string, amount: number): Promise<PaymentOrder | null> {
  const orders = await readOrders();
  const now = Date.now();

  const order = orders
    .filter(
      (o) =>
        o.status === "pending" &&
        o.amount === amount &&
        new Date(o.expiresAt).getTime() > now - EXPIRE_GRACE_MS &&
        !o.eventId
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))[0];

  if (!order) return null;
  order.status = "paid";
  order.paidAt = new Date().toISOString();
  order.eventId = eventKey;
  await writeOrders(orders);
  return order;
}

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
  const events = await readEvents();
  if (events.some((e) => e.eventKey === eventKey && e.matched)) {
    return { ok: true, status: 200, result: { matched: false } };
  }
  events.push({ eventKey, amount: parsed.amount, createdAt: new Date().toISOString(), matched: false });
  await writeEvents(events);

  const order = await claimPaymentEvent(eventKey, parsed.amount);
  if (!order) {
    await writeEvents(
      (await readEvents()).map((e) => (e.eventKey === eventKey ? { ...e, matched: false } : e))
    );
    return { ok: true, status: 200, result: { matched: false } };
  }

  await writeEvents((await readEvents()).map((e) => (e.eventKey === eventKey ? { ...e, matched: true } : e)));

  const fulfilled = await fulfillOrder(order.invoice);

  return { ok: true, status: 200, result: { matched: true, invoice: order.invoice, fulfilled } };
}

/** Fulfillment: tambah kuota bandel ke member setelah order paid. Idempoten. */
export async function fulfillOrder(invoice: string): Promise<string | null> {
  const orders = await readOrders();
  const order = orders.find((o) => o.invoice === invoice);
  if (!order) return null;
  if (order.delivered) return order.delivered;
  if (order.status !== "paid") return null;

  const { addCustomerQuotaByToken } = await import("./member-quota");
  const r = await addCustomerQuotaByToken(order.buyerToken, order.tokens, order.validDays);

  const delivered = r.ok
    ? `+${order.tokens.toLocaleString("id-ID")} token → ${r.memberName ?? "member"} (sisa reseller: ${r.remainingQuota?.toLocaleString("id-ID") ?? "?"})`
    : null;

  if (r.ok) {
    order.delivered = delivered ?? `+${order.tokens} token`;
    await writeOrders(orders);
  }
  return delivered;
}
