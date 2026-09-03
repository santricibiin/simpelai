import { Telegraf } from "telegraf";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url)); // web/scripts
const WEB = path.resolve(ROOT, "..");

/* ---------- env ---------- */

function loadEnv() {
  const f = path.join(WEB, ".env");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

/* ---------- mysql ---------- */

const DB_URL = process.env.DATABASE_URL || "mysql://neuroforge:9138d307ba0f9c917632fbc5a00e283f@127.0.0.1:3306/neuroforge";
const pool = mysql.createPool({ uri: DB_URL, connectionLimit: 5 });
async function q(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

const BANDEL_BASE = (process.env.RESELLER_API_URL || "https://bandelbanget.xyz").replace(/\/$/, "");
const RESELLER_API_KEY = process.env.RESELLER_API_KEY || "";

/* ---------- app settings via mysql ---------- */

async function readSetting(key, fallback) {
  try {
    const rows = await q("SELECT `value` FROM app_settings WHERE `key` = ?", [key]);
    if (!rows.length) return fallback;
    const raw = rows[0].value;
    if (typeof raw === "string") return JSON.parse(raw);
    if (raw && typeof raw === "object") return raw;
    return fallback;
  } catch {
    return fallback;
  }
}

/* ---------- QRIS statis → dinamis ---------- */

function crc16(p) {
  let crc = 0xffff;
  for (let i = 0; i < p.length; i++) {
    crc ^= p.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
function tlv(id, v) {
  return `${id}${String(v.length).padStart(2, "0")}${v}`;
}
function qrisStaticToDynamic(qris, amount) {
  const s = qris.trim();
  const tags = [];
  let i = 0;
  while (i + 4 <= s.length) {
    const id = s.slice(i, i + 2);
    const len = parseInt(s.slice(i + 2, i + 4), 10);
    if (!Number.isFinite(len)) throw new Error("QRIS invalid");
    const value = s.slice(i + 4, i + 4 + len);
    if (value.length !== len) throw new Error("QRIS invalid");
    tags.push({ id, value });
    i += 4 + len;
  }
  if (i !== s.length || !tags.some((t) => t.id === "63")) throw new Error("QRIS invalid");
  let body = tags.filter((t) => t.id !== "63" && !["54", "55", "56", "57"].includes(t.id));
  body = body.map((t) => (t.id === "01" && t.value === "11" ? { id: "01", value: "12" } : t));
  const idx58 = body.findIndex((t) => t.id === "58");
  if (idx58 === -1) throw new Error("QRIS invalid");
  body = [...body.slice(0, idx58), { id: "54", value: String(amount) }, ...body.slice(idx58)];
  const payload = body.map((t) => tlv(t.id, t.value)).join("") + "6304";
  return payload + crc16(payload);
}

/* ---------- format helpers ---------- */

// ID kategori stabil dari nama (fnv1a → base36) — tahan nama panjang
function catKey(name) {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

const rupiah = (n) => `Rp${Number(n).toLocaleString("id-ID")}`;
const num = (n) => Number(n).toLocaleString("id-ID");
const nowWIB = () =>
  new Date(Date.now() + 7 * 3600_000).toISOString().replace("T", " ").slice(0, 19) + " WIB";
const todayWIB = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const clockWIB = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(11, 19);
const maskInvoice = (inv) => (inv.length > 8 ? `${inv.slice(0, 3)}•••••${inv.slice(-3)}` : inv);
const maskStr = (s) => (s ? `${s.slice(0, 2)}${"•".repeat(Math.max(2, s.length - 3))}${s.slice(-1)}` : "—");

/* ---------- config ---------- */

const DEFAULT_CONFIG = {
  token: "",
  adminId: "",
  forceJoinOn: false,
  forceJoinLink: "",
  forceJoinChatId: "",
  notifyChannelId: "",
  started: false,
};

async function saveConfigPatch(patch) {
  const cur = await readSetting("telegram", {});
  const rows = await q(
    "INSERT INTO app_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
    ["telegram", JSON.stringify({ ...cur, ...patch })]
  );
  return rows;
}

const CONFIG = { ...DEFAULT_CONFIG, ...(await readSetting("telegram", {})) };
const BOT_TOKEN = process.argv[2] || CONFIG.token;
const ADMIN_ID = String(CONFIG.adminId || process.env.ADMIN_TELEGRAM_ID || "");

if (!BOT_TOKEN) {
  console.error("[telegram-bot] token kosong — isi di admin panel dulu");
  process.exit(1);
}

/* ---------- kategori & produk (dari products.json simpelai) ---------- */

function categoryOf(p) {
  if (p.source === "manual") return p.category || "Lainnya";
  if (p.source === "bandel") return "Token AI";
  return "Token Gateway";
}

async function getCatalog() {
  const rows = await q("SELECT * FROM products WHERE enabled = 1 ORDER BY created_at ASC");
  const products = rows.map((r) => ({
    id: r.id, name: r.name, source: r.source, tierId: r.tier_id, category: r.category,
    productCode: r.product_code, tokens: Number(r.tokens), validDays: r.valid_days,
    price: r.price, stock: r.stock, soldCount: r.sold_count,
  }));
  const cats = new Map();
  for (const p of products) {
    const c = categoryOf(p);
    if (!cats.has(c)) cats.set(c, []);
    cats.get(c).push(p);
  }
  return { products, cats: [...cats.entries()].map(([name, items]) => ({ name, items })) };
}

async function stockOf(p) {
  if (p.source === "manual") return p.stock ?? 0;
  if (p.source === "gateway") return p.stock === null || p.stock === undefined ? 9999 : p.stock;
  return bandelQuota(); // bandel: kuota reseller asli (null = tidak diketahui → jangan blok)
}

let quotaCache = { at: 0, value: null };
async function bandelQuota() {
  if (Date.now() - quotaCache.at < 15_000) return quotaCache.value;
  try {
    const r = await fetch(`${BANDEL_BASE}/api/reseller/v1/quota`, {
      headers: { Authorization: `Bearer ${RESELLER_API_KEY}` },
    });
    const d = await r.json();
    quotaCache = { at: Date.now(), value: typeof d.quota === "number" ? d.quota : null };
  } catch {
    quotaCache = { at: Date.now(), value: quotaCache.value };
  }
  return quotaCache.value;
}

/* ---------- orders (shared dgn web: data/payment-orders.json) ---------- */

async function getOrders() {
  const rows = await q("SELECT * FROM payment_orders ORDER BY created_at ASC");
  return rows.map(mapOrderRow);
}
async function getOrder(invoice) {
  const rows = await q("SELECT * FROM payment_orders WHERE invoice = ?", [invoice]);
  return rows.length ? mapOrderRow(rows[0]) : null;
}
function mapOrderRow(r) {
  return {
    invoice: r.invoice, status: r.status, amount: r.amount, uniqueCode: r.unique_code,
    productId: r.product_id, productName: r.product_name, tokens: Number(r.tokens),
    validDays: r.valid_days, source: r.source, tierId: r.tier_id, category: r.category,
    productCode: r.product_code, buyerToken: r.buyer_token, qty: r.qty,
    qrisPayload: r.qris_payload, delivered: r.delivered,
    deliveryPayload: r.delivery_payload || null,
    createdAt: new Date(r.created_at).toISOString(),
    expiresAt: new Date(r.expires_at).toISOString(),
    paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
    tg: r.tg_user_id ? { userId: r.tg_user_id, chatId: r.tg_chat_id, name: r.tg_name, username: r.tg_username, qrisMessageId: r.tg_qris_message_id } : null,
    tgDelivered: Boolean(r.tg_delivered),
  };
}
function invoiceCode() {
  return `INV${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function createTelegramOrder(product, qty, tgUser, chatId) {
  const settings = await readSetting("payment", { qrisProvider: "none", qrisStatic: "", uniqueCodeEnabled: true, ttlMinutes: 10 });
  if (settings.qrisProvider === "none" || !settings.qrisStatic) {
    return { ok: false, error: "QRIS belum dikonfigurasi di dashboard." };
  }
  const stok = await stockOf(product);
  if (stok !== null && stok < qty) return { ok: false, error: "Stok habis." };
  // bandel: kuota harus cukup untuk 1 unit produk (qty selalu 1 untuk bandel)
  if (product.source === "bandel") {
    const quota = await bandelQuota();
    if (quota !== null && product.tokens > quota) return { ok: false, error: "Kuota reseller tidak cukup." };
  }

  // satu invoice aktif per user telegram
  await q("UPDATE payment_orders SET status = 'expired' WHERE tg_user_id = ? AND status = 'pending'", [String(tgUser.id)]);

  const base = product.price * qty;

  const ttl = Math.max(1, Math.min(120, settings.ttlMinutes || 10));
  const invoice = invoiceCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttl * 60_000);

  // transaksi + FOR UPDATE: serialisasi nominal duplikat antar request paralel
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let finalAmount = amount;
    let finalUnique = uniqueCode;
    if (settings.uniqueCodeEnabled) {
      const [pending] = await conn.query(
        "SELECT amount FROM payment_orders WHERE status = 'pending' AND expires_at > NOW() FOR UPDATE",
        []
      );
      const used = new Set(pending.map((p) => p.amount));
      for (let i = 0; i < 80; i++) {
        const unik = Math.floor(Math.random() * 499) + 1; // range bot 1-499 (web 100-999)
        const candidate = base + unik;
        if (!used.has(candidate)) {
          finalAmount = candidate;
          finalUnique = unik;
          break;
        }
      }
      if (!finalUnique) throw new Error("Nominal pembayaran sedang penuh. Coba lagi.");
    }

    let payload;
    try {
      payload = qrisStaticToDynamic(settings.qrisStatic, finalAmount);
    } catch {
      throw new Error("QRIS statis tidak valid. Hubungi admin.");
    }

    await conn.query(
      `INSERT INTO payment_orders
       (invoice, status, amount, unique_code, product_id, product_name, tokens, valid_days, source, tier_id, category, product_code, buyer_token, qty, qris_payload, tg_user_id, tg_chat_id, tg_name, tg_username, expires_at)
       VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [invoice, finalAmount, finalUnique, product.id, product.name, product.tokens, product.validDays,
       product.source, product.tierId ?? null, categoryOf(product), product.productCode ?? null,
       qty, payload, String(tgUser.id), String(chatId), tgUser.first_name || "", tgUser.username || "", expiresAt]
    );
    await conn.commit();

    return { ok: true, order: { invoice, amount: finalAmount, uniqueCode: finalUnique, qrisPayload: payload, productName: product.name, category: categoryOf(product), productCode: product.productCode, tierId: product.tierId }, ttl };
  } catch (e) {
    await conn.rollback();
    return { ok: false, error: e instanceof Error ? e.message : "Gagal membuat pesanan." };
  } finally {
    conn.release();
  }
}

async function cancelTelegramOrder(invoice) {
  const r = await q("UPDATE payment_orders SET status = 'expired' WHERE invoice = ? AND status = 'pending'", [invoice]);
  return r.affectedRows === 1;
}

/* ---------- delivery ---------- */

async function takeManualStock(productId, qty) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query("SELECT id, value FROM product_stocks WHERE product_id = ? ORDER BY id ASC LIMIT ? FOR UPDATE", [productId, qty]);
    const items = rows;
    if (items.length < qty) {
      await conn.rollback();
      return null;
    }
    await conn.query("DELETE FROM product_stocks WHERE id IN (?)", [items.map((i) => i.id)]);
    await conn.query("UPDATE products SET stock = stock - ?, sold_count = sold_count + ? WHERE id = ?", [qty, qty, productId]);
    await conn.commit();
    return items.map((i) => i.value);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function bandelProvision(name, maxTokens, validDays) {
  const r = await fetch(`${BANDEL_BASE}/api/reseller/v1/customer-keys`, {
    method: "POST",
    headers: { Authorization: `Bearer ${RESELLER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: String(name).slice(0, 40), maxTokens, validDays }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `create-key gagal (${r.status})`);

  const token = (d.dashboardUrl || "").match(/\/quota\/([a-f0-9]{16,})/)?.[1] || "";

  // setup PIN default 111111
  try {
    await fetch(`${BANDEL_BASE}/api/public/quota/${token}/setup-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "111111", confirmPin: "111111" }),
    });
  } catch {}

  return { key: d.key, dashboardToken: token, name: d.name || name };
}

async function deliverOrder(order) {
  // retry: item/provisi SUDAH diambil sebelumnya — pakai payload yang sama, jangan ambil stok baru
  if (order.deliveryPayload) {
    try {
      return JSON.parse(order.deliveryPayload);
    } catch {}
  }
  if (order.source === "manual") {
    const taken = await takeManualStock(order.productId, order.qty || 1);
    if (!taken) throw new Error("stok tidak cukup");
    return { type: "items", items: taken };
  }
  if (order.source === "bandel") {
    if (order.tokens > ((await bandelQuota()) ?? Infinity)) throw new Error("kuota reseller tidak cukup");
    const prov = await bandelProvision(order.tg?.username || order.tg?.name || "member", order.tokens, order.validDays || 28);
    return { type: "bandel", prov };
  }
  return { type: "gateway" };
}

function formatDelivery(order, d) {
  if (d.type === "items") return "```\n" + d.items.join("\n") + "\n```";
  if (d.type === "bandel") {
    const origin = process.env.PUBLIC_ORIGIN || "https://buatprem.biz.id";
    const apiBase = process.env.PUBLIC_API_ORIGIN || origin;
    return [
      `Paket: ${order.productName}`,
      `Token: ${num(order.tokens)} · ${order.validDays} hari`,
      `Nama: ${d.prov.name}`,
      `Dashboard: ${origin}/quota/${d.prov.dashboardToken}`,
      `PIN: 111111`,
      `API Key: ${d.prov.key}`,
      `API Base: ${apiBase}/v1`,
    ].join("\n");
  }
  return "Produk gateway — pengiriman diproses admin manual. Hubungi admin.";
}

/* ---------- members ---------- */

async function upsertMember(u) {
  const userId = String(u.id);
  const existing = await q("SELECT user_id FROM telegram_members WHERE user_id = ?", [userId]);
  if (existing.length) {
    await q("UPDATE telegram_members SET name = COALESCE(?, name), username = COALESCE(?, username), last_seen = NOW() WHERE user_id = ?", [
      u.first_name || null, u.username || null, userId,
    ]);
    return { member: { userId }, isNew: false };
  }
  await q("INSERT INTO telegram_members (user_id, name, username) VALUES (?, ?, ?)", [
    userId, u.first_name || "", u.username || "",
  ]);
  return { member: { userId }, isNew: true };
}

/* ---------- bot ---------- */

const bot = new Telegraf(BOT_TOKEN);
const PAGE = 5;

const qtyByUser = new Map();
const qtyEditPending = new Map();

const isAdmin = (ctx) => String(ctx.from?.id) === ADMIN_ID;

async function md(ctx, text, keyboard, extra = {}) {
  try {
    return await ctx.replyWithMarkdown(text.replace(/!/g, "\\!").replace(/\.{3}/g, "…"), {
      reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined,
      ...extra,
    });
  } catch {
    return ctx.reply(text.replace(/[*_`]/g, ""), {
      reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined,
      ...extra,
    });
  }
}

async function catKeyboard(page) {
  const { cats } = await getCatalog();
  if (cats.length === 0) return { text: "📭 Katalog masih kosong. Coba lagi nanti.", kb: null };
  const pages = Math.max(1, Math.ceil(cats.length / PAGE));
  const slice = cats.slice(page * PAGE, page * PAGE + PAGE);
  const kb = [];
  kb.push(slice.map((c, i) => ({ text: `${page * PAGE + i + 1}`, callback_data: `cat:${catKey(c.name)}:${page}` })));
  if (pages > 1) {
    const nav = [];
    if (page > 0) nav.push({ text: "‹", callback_data: `cats:${page - 1}` });
    nav.push({ text: `${page + 1}/${pages}`, callback_data: "noop" });
    if (page < pages - 1) nav.push({ text: "›", callback_data: `cats:${page + 1}` });
    kb.push(nav);
  }
  kb.push([{ text: "Menu awal", callback_data: "home" }]);
  const list = slice.map((c, i) => `${page * PAGE + i + 1}. ${c.name}`).join("\n");
  const text = `🏷 *Katalog Kategori*\n\n${list}\n\n👆 Pilih nomor kategori lewat tombol di bawah.\n📄 Gunakan ‹ › bila ada lebih dari satu halaman.`;
  return { text, kb };
}

async function catProducts(key, page) {
  const { cats } = await getCatalog();
  const cat = cats.find((c) => catKey(c.name) === key);
  if (!cat) return { text: "Kategori tidak ditemukan.", kb: [[{ text: "Kembali ke kategori", callback_data: "products:0" }]] };
  const catName = cat.name;
  if (cat.items.length === 0) return { text: `Belum ada produk di kategori *${catName}*.`, kb: [[{ text: "Kembali ke kategori", callback_data: "products:0" }]] };
  const pages = Math.max(1, Math.ceil(cat.items.length / PAGE));
  const slice = cat.items.slice(page * PAGE, page * PAGE + PAGE);
  const kb = [];
  kb.push(slice.map((p, i) => ({ text: `${page * PAGE + i + 1}`, callback_data: `prd:${p.id}` })));
  if (pages > 1) {
    const nav = [];
    if (page > 0) nav.push({ text: "‹", callback_data: `cat:${key}:${page - 1}` });
    nav.push({ text: `${page + 1}/${pages}`, callback_data: "noop" });
    if (page < pages - 1) nav.push({ text: "›", callback_data: `cat:${key}:${page + 1}` });
    kb.push(nav);
  }
  kb.push([{ text: "Kembali ke kategori", callback_data: "products:0" }]);
  const list = slice
    .map((p, i) => `[${page * PAGE + i + 1}] ${p.name} — *${rupiah(p.price)}*`)
    .join("\n");
  const text = `📦 *${catName}*\n\n${list}\n\n🔍 Ketuk nomor produk untuk detail, stok, dan harga.`;
  return { text, kb };
}

async function productDetail(productId, qty) {
  const { products } = await getCatalog();
  const p = products.find((x) => x.id === productId);
  if (!p) return { text: "Produk tidak ditemukan.", kb: [[{ text: "Kembali ke kategori", callback_data: "products:0" }]] };

  let stok;
  if (p.source === "bandel") {
    stok = await bandelQuota();
  } else {
    stok = await stockOf(p);
  }
  const stokLabel = p.source === "bandel" ? (stok === null ? "—" : stok >= p.tokens ? "Tersedia" : "Habis") : `${stok} unit`;
  const available = p.source === "bandel" ? stok === null || stok >= p.tokens : stok > 0;
  const total = p.price * qty;

  const text = [
    `💎 *${p.name}*`,
    ``,
    `🔖 Kode · \`${p.productCode || p.tierId?.toUpperCase() || p.id}\``,
    `📁 Kategori · ${categoryOf(p)}`,
    `💰 Harga · ${rupiah(p.price)}`,
    `📊 Stok · ${stokLabel}`,
    `🛒 Jumlah · ${qty}`,
    `🧾 Estimasi · ${rupiah(total)}`,
    p.source === "manual" ? `` : `📝 *Detail*\n${num(p.tokens)} token · ${p.validDays} hari masa aktif`,
    ``,
    `Atur jumlah lalu tekan *Beli sekarang*.`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  const kb = [];
  if (p.source !== "bandel") {
    kb.push([
      { text: "−", callback_data: `qty:${p.id}:-` },
      { text: "✎", callback_data: `qtyedit:${p.id}` },
      { text: "+", callback_data: `qty:${p.id}:+` },
    ]);
  }
  kb.push(
    available
      ? [{ text: "Beli sekarang", callback_data: `buy:${p.id}` }]
      : [{ text: "⛔ Stok habis", callback_data: "noop" }]
  );
  kb.push([
    { text: "Kembali ke kategori", callback_data: `cat:${catKey(categoryOf(p))}:0` },
  ]);
  return { text, kb };
}

async function sendInvoice(ctx, order, ttl) {
  const settings = await readSetting("payment", {});
  const provLabel = { dana: "DANA", neobank: "Nobu/Neobank", gopay: "GoPay" }[settings.qrisProvider] || settings.qrisProvider;

  const text = [
    `💳 *Invoice · Menunggu pembayaran*`,
    ``,
    `🆔 \`${order.invoice}\``,
    `📦 *${order.productName}*`,
    `🔖 \`${order.productCode || order.tierId?.toUpperCase() || "-"}\``,
    `💵 Harga · ${rupiah(order.productId ? order.amount - order.uniqueCode : order.amount)}`,
    `🔢 Qty · ${order.qty || 1}`,
    order.uniqueCode ? `🔐 Kode unik · \`${order.uniqueCode}\`` : "",
    `💎 *Total transfer · ${rupiah(order.amount)}*`,
    `🏦 Metode · QRIS (${provLabel})`,
    `⏳ Berlaku *${ttl} menit*`,
    ``,
    `📷 Scan QRIS di bawah.`,
    `⚠️ Transfer *persis* sesuai total agar otomatis terverifikasi.`,
  ]
    .filter(Boolean)
    .join("\n");

  const kb = [
    [{ text: "❌ Batalkan transaksi", callback_data: `cancel:${order.invoice}` }],
    [{ text: "🏷 Kembali ke kategori", callback_data: `cat:${catKey(order.category)}:0` }],
  ];

  let msg;
  try {
    const QRCode = (await import("qrcode")).default;
    const png = await QRCode.toBuffer(order.qrisPayload, { width: 400, margin: 2 });
    msg = await ctx.replyWithPhoto({ source: png, filename: "qris.png" }, { caption: text, parse_mode: "Markdown", reply_markup: { inline_keyboard: kb } });
  } catch {
    msg = await md(ctx, `${text}\n\nPayload: \`${order.qrisPayload}\``, kb);
  }
  return msg;
}

/* ---------- commands ---------- */

bot.start(async (ctx) => {
  const { isNew } = await upsertMember(ctx.from);

  if (CONFIG.forceJoinOn && CONFIG.forceJoinChatId && !isAdmin(ctx)) {
    const ok = await checkJoin(ctx.from.id);
    if (!ok) {
      await md(
        ctx,
        [
          `🔐 *Akses terbatas*`,
          ``,
          `Halo *${ctx.from.first_name}*!`,
          ``,
          `Untuk membuka katalog dan bertransaksi di bot ini, silakan bergabung ke *channel resmi* kami terlebih dahulu.`,
          ``,
          `✨ Manfaat join:`,
          `• Info produk & promo terbaru`,
          `• Notifikasi update stok`,
          `• Akses penuh ke bot`,
          ``,
          `1️⃣ Tekan *Gabung channel*`,
          `2️⃣ Setelah join, tekan *Saya sudah join*`,
          ``,
          `Kami cek keanggotaan secara otomatis.`,
        ].join("\n"),
        [
          [{ text: "📢 Gabung channel", url: CONFIG.forceJoinLink }],
          [{ text: "✅ Saya sudah join", callback_data: "checkjoin" }],
        ]
      );
      return;
    }
  }

  const tanggal = nowWIB().slice(0, 10);
  await md(
    ctx,
    [
      `✨ *Selamat datang, ${ctx.from.first_name}*`,
      ``,
      `👤 Akun · \`${ctx.from.username || ctx.from.id}\``,
      `🗓 ${tanggal}`,
      ``,
      `🛍 Katalog premium siap dibuka.`,
      `Ketik /produk untuk mulai belanja dengan nyaman.`,
    ].join("\n")
  );
  void isNew;
});

bot.command("produk", async (ctx) => {
  await upsertMember(ctx.from);
  const { text, kb } = await catKeyboard(0);
  await md(ctx, text, kb);

  if (ADMIN_ID) {
    notifyAdmin(
      [
        `🛍 *USER BUKA PRODUK*`,
        ``,
        `👤 ${ctx.from.first_name} ${ctx.from.last_name || ""}`.trim(),
        `🆔 \`${ctx.from.id}\``,
        `🔗 @${ctx.from.username || "—"}`,
        `⏰ ${nowWIB()}`,
      ].join("\n")
    ).catch(() => {});
  }
});

bot.command("admin", async (ctx) => {
  if (!isAdmin(ctx)) return;
  const url = process.env.PUBLIC_ORIGIN || "https://buatprem.biz.id";
  await md(
    ctx,
    [`🛡 *ADMIN PANEL*`, `━━━━━━━━━━━━━━━━`, `Halo, *${ctx.from.first_name}*!`, `Kendalikan dashboard lewat *web admin*.`, `🌐 ${url}/admin`].join("\n"),
    [[{ text: "🚀 Buka Dashboard", url: `${url}/admin` }]]
  );
});

bot.command("ceksaldo", async (ctx) => {
  if (!isAdmin(ctx)) return;
  try {
    const r = await fetch(`${BANDEL_BASE}/api/reseller/v1/quota`, {
      headers: { Authorization: `Bearer ${RESELLER_API_KEY}` },
    });
    const d = await r.json();
    await md(
      ctx,
      [
        `💰 *CEK SALDO BANDEL*`,
        `━━━━━━━━━━━━━━━━`,
        `📦 Kuota token : *${num(d.quota)}*`,
        `💵 Saldo akun  : *${num(d.balance)}*`,
        `⏰ Dicek       : ${clockWIB()} WIB`,
      ].join("\n")
    );
  } catch {
    await ctx.reply("Gagal mengambil saldo.");
  }
});

bot.command("cektrx", async (ctx) => {
  if (!isAdmin(ctx)) return;
  const today = todayWIB();
  const paid = (
    await q("SELECT * FROM payment_orders WHERE status = 'paid' AND DATE(CONVERT_TZ(paid_at, '+00:00', '+07:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))")
  ).map(mapOrderRow);
  const omzet = paid.reduce((s, o) => s + o.amount, 0);
  await md(
    ctx,
    [
      `📊 *LAPORAN TRANSAKSI HARI INI*`,
      `━━━━━━━━━━━━━━━━`,
      `📅 Tanggal          : ${today}`,
      `🧾 Transaksi sukses : *${paid.length}*`,
      `💰 Omzet kotor      : *${rupiah(omzet)}*`,
      `⏰ Dicek            : ${clockWIB()} WIB`,
    ].join("\n")
  );
});

bot.command("bc", async (ctx) => {
  if (!isAdmin(ctx)) return;
  const pesan = ctx.message?.text?.replace(/^\/bc\s*/, "").trim();
  if (!pesan) return ctx.reply("Format: /bc <pesan>");
  const memberRows = await q("SELECT user_id FROM telegram_members");
  const members = memberRows.map((m) => ({ userId: m.user_id }));
  const prog = await ctx.reply(`📤 Mengirim broadcast ke ${members.length} user…`);
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < members.length; i += 20) {
    const batch = members.slice(i, i + 20);
    for (const m of batch) {
      try {
        await bot.telegram.sendMessage(m.userId, pesan, { parse_mode: "Markdown" }).catch(() => bot.telegram.sendMessage(m.userId, pesan));
        ok++;
      } catch {
        fail++;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  await ctx.deleteMessage(prog.message_id).catch(() => {});
  await md(
    ctx,
    [
      `✅ *BROADCAST SELESAI*`,
      ``,
      `👥 Total user : ${members.length}`,
      `📨 Terkirim   : ${ok}`,
      `⚠️ Gagal      : ${fail}`,
      `⏰ Waktu      : ${clockWIB()} WIB`,
      ``,
      `💡 User gagal kemungkinan sudah blokir bot.`,
    ].join("\n")
  );
});

bot.command("getid", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.reply(`Chat ID: \`${ctx.chat.id}\``, { parse_mode: "Markdown" });
});

bot.on("channel_post", async (ctx) => {
  if (ctx.channelPost?.text?.startsWith("/getid") && isAdmin(ctx)) {
    await ctx.reply(`Channel ID: \`${ctx.chat.id}\``, { parse_mode: "Markdown" });
  }
});

bot.on("text", async (ctx) => {
  const pending = qtyEditPending.get(ctx.from.id);
  if (!pending) return;
  const n = parseInt(ctx.message.text.replace(/\D/g, ""), 10);
  const { products } = await getCatalog();
  const p = products.find((x) => x.id === pending.productId);
  ctx.deleteMessage(ctx.message.message_id).catch(() => {});
  if (!p) return qtyEditPending.delete(ctx.from.id);
  const maxP = (await stockOf(p)) ?? 1;
  if (!n || n < 1 || n > maxP) {
    const r = await ctx.reply(`Jumlah 1-${maxP}`);
    setTimeout(() => ctx.deleteMessage(r.message_id).catch(() => {}), 2000);
    return;
  }
  qtyByUser.set(`${ctx.from.id}:${p.id}`, n);
  qtyEditPending.delete(ctx.from.id);
  const detail = await productDetail(p.id, n);
  try {
    await ctx.telegram.editMessageText(pending.chatId, pending.messageId, undefined, detail.text, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: detail.kb },
    });
  } catch {}
});

/* ---------- callbacks ---------- */

async function checkJoin(userId) {
  try {
    const m = await bot.telegram.getChatMember(CONFIG.forceJoinChatId, userId);
    return ["creator", "administrator", "member", "restricted"].includes(m.status);
  } catch {
    return false;
  }
}

bot.action("checkjoin", async (ctx) => {
  const ok = await checkJoin(ctx.from.id);
  if (!ok) return ctx.answerCbQuery("Belum terdeteksi join. Pastikan sudah join channel.", { show_alert: true });
  await ctx.answerCbQuery("Berhasil! Selamat datang ✨");
  const tanggal = nowWIB().slice(0, 10);
  await md(
    ctx,
    [
      `✨ *Selamat datang, ${ctx.from.first_name}*`,
      ``,
      `👤 Akun · \`${ctx.from.username || ctx.from.id}\``,
      `🗓 ${tanggal}`,
      ``,
      `🛍 Katalog premium siap dibuka.`,
      `Ketik /produk untuk mulai belanja dengan nyaman.`,
    ].join("\n")
  );
});

bot.action(/cats:(\d+)/, async (ctx) => {
  const { text, kb } = await catKeyboard(Number(ctx.match[1]));
  await ctx.answerCbQuery();
  try {
    await ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: { inline_keyboard: kb } });
  } catch {}
});

bot.action(/cat:([A-Za-z0-9_-]+):(\d+)/, async (ctx) => {
  const { text, kb } = await catProducts(ctx.match[1], Number(ctx.match[2]));
  await ctx.answerCbQuery();
  try {
    await ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: { inline_keyboard: kb } });
  } catch {}
});

bot.action("products:0", async (ctx) => {
  const { text, kb } = await catKeyboard(0);
  await ctx.answerCbQuery();
  try {
    await ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: { inline_keyboard: kb } });
  } catch {}
});

bot.action(/prd:(\w+)/, async (ctx) => {
  qtyByUser.set(`${ctx.from.id}:${ctx.match[1]}`, 1);
  const detail = await productDetail(ctx.match[1], 1);
  await ctx.answerCbQuery();
  try {
    await ctx.editMessageText(detail.text, { parse_mode: "Markdown", reply_markup: { inline_keyboard: detail.kb } });
  } catch {}
});

bot.action(/qty:(\w+):([+-])/, async (ctx) => {
  const { products } = await getCatalog();
  const p = products.find((x) => x.id === ctx.match[1]);
  if (!p) return ctx.answerCbQuery("Produk tidak ditemukan");
  const cur = qtyByUser.get(`${ctx.from.id}:${p.id}`) || 1;
  const max = Math.max(1, (await stockOf(p)) ?? 1);
  const next = Math.min(max, Math.max(1, cur + (ctx.match[2] === "+" ? 1 : -1)));
  qtyByUser.set(`${ctx.from.id}:${p.id}`, next);
  const detail = await productDetail(p.id, next);
  await ctx.answerCbQuery(`Jumlah: ${next}`);
  try {
    await ctx.editMessageText(detail.text, { parse_mode: "Markdown", reply_markup: { inline_keyboard: detail.kb } });
  } catch {}
});

bot.action(/qtyedit:(\w+)/, async (ctx) => {
  await ctx.answerCbQuery("Silahkan ketik jumlah");
  qtyEditPending.set(ctx.from.id, {
    productId: ctx.match[1],
    chatId: ctx.chat.id,
    messageId: ctx.callbackQuery.message.message_id,
  });
});

bot.action(/buy:(\w+)/, async (ctx) => {
  await ctx.answerCbQuery("Membuat invoice...");
  const { products } = await getCatalog();
  const p = products.find((x) => x.id === ctx.match[1]);
  if (!p) return;
  const qty = p.source === "bandel" ? 1 : qtyByUser.get(`${ctx.from.id}:${p.id}`) || 1;

  const r = await createTelegramOrder(p, qty, ctx.from, ctx.chat.id);
  if (!r.ok) return ctx.reply(r.error);

  // hapus pesan detail produk
  ctx.deleteMessage(ctx.callbackQuery.message.message_id).catch(() => {});
  const msg = await sendInvoice(ctx, { ...r.order, qty }, r.ttl);

  // simpan qrisMessageId
  await q("UPDATE payment_orders SET tg_qris_message_id = ? WHERE invoice = ?", [msg?.message_id ?? null, r.order.invoice]);
});

bot.action(/cancel:(\w+)/, async (ctx) => {
  const invoice = ctx.match[1];
  const ok = await cancelTelegramOrder(invoice);
  await ctx.answerCbQuery(ok ? "Transaksi dibatalkan" : "Transaksi tidak ditemukan / sudah diproses");
  if (!ok) return;
  ctx.deleteMessage(ctx.callbackQuery.message.message_id).catch(() => {});
  const o = await getOrder(invoice);
  await md(ctx, `Transaksi *${invoice}* dibatalkan.\n\nAnda dapat memesan ulang kapan saja.`, [
    [{ text: "🏷 Kembali ke kategori", callback_data: `cat:${catKey(o?.category || "")}:0` }],
  ]);
});

bot.action("home", async (ctx) => {
  await ctx.answerCbQuery();
  const { text, kb } = await catKeyboard(0);
  try {
    await ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: { inline_keyboard: kb } });
  } catch {}
});

bot.action("noop", async (ctx) => ctx.answerCbQuery());

bot.catch((err) => console.error("[telegram-bot] error:", err));

/* ---------- admin/channel notify ---------- */

async function notifyAdmin(text) {
  if (!ADMIN_ID) return;
  try {
    await bot.telegram.sendMessage(ADMIN_ID, text, { parse_mode: "Markdown" });
  } catch {}
}

async function notifyChannel(text) {
  const ch = CONFIG.notifyChannelId || CONFIG.forceJoinChatId;
  if (!ch) return;
  try {
    await bot.telegram.sendMessage(ch, text, { parse_mode: "Markdown" });
  } catch {}
}

/* ---------- poller: expire + delivery + notify ---------- */

setInterval(async () => {
  try {
    // 1. expired: pending lewat TTL + grace 10 menit → tandai + notif user
    const expired = await q(
      `SELECT * FROM payment_orders
       WHERE status = 'pending' AND tg_user_id IS NOT NULL AND tg_notif_expired = 0
         AND expires_at <= (NOW() - INTERVAL 10 MINUTE)`
    );
    for (const row of expired) {
      const o = mapOrderRow(row);
      await q("UPDATE payment_orders SET status = 'expired', tg_notif_expired = 1 WHERE invoice = ?", [o.invoice]);
      try {
        if (o.tg?.qrisMessageId) await bot.telegram.deleteMessage(o.tg.chatId, o.tg.qrisMessageId).catch(() => {});
        await bot.telegram.sendMessage(
          o.tg.chatId,
          [
            `⌛ *Pembayaran kedaluwarsa*`,
            ``,
            `🆔 \`${o.invoice}\``,
            `📦 ${o.productName}`,
            `💰 *${rupiah(o.amount)}*`,
            ``,
            `QRIS tidak lagi berlaku.`,
            `Silakan buat pesanan baru dari katalog jika masih berminat.`,
          ].join("\n"),
          {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [[{ text: "🏷 Kembali ke kategori", callback_data: `cat:${catKey(o.category || "")}:0` }]] },
          }
        );
      } catch {}
    }

    // 2. delivery: paid + telegram + belum tg_delivered → kirim item + notif
    const due = await q(
      `SELECT * FROM payment_orders
       WHERE status = 'paid' AND tg_user_id IS NOT NULL AND tg_delivered = 0
       ORDER BY created_at ASC LIMIT 5`
    );
    for (const row of due) {
      const o = mapOrderRow(row);
      // claim atomic supaya tidak double kirim
      const claim = await q(
        "UPDATE payment_orders SET tg_delivered = 1 WHERE invoice = ? AND tg_delivered = 0",
        [o.invoice]
      );
      if (claim.affectedRows !== 1) continue;

      // order gateway: tidak otomatis — WAJIB notif admin
      if (o.source === "gateway") {
        await q("UPDATE payment_orders SET delivered = 'gateway manual (tunggu admin)' WHERE invoice = ?", [o.invoice]);
        try {
          if (o.tg?.qrisMessageId) await bot.telegram.deleteMessage(o.tg.chatId, o.tg.qrisMessageId).catch(() => {});
          await bot.telegram.sendMessage(
            o.tg.chatId,
            `✅ *Pembayaran diterima*\n\n🆔 \`${o.invoice}\`\n📦 *${o.productName}*\n💰 ${rupiah(o.amount)}\n\nPengiriman produk gateway diproses manual oleh admin, maksimal 1x24 jam.`,
            { parse_mode: "Markdown" }
          );
        } catch {}
        await notifyAdmin(
          [
            `⚠️ *ORDER GATEWAY PERLU DIPROSES MANUAL*`,
            ``,
            `🆔 \`${o.invoice}\``,
            `📦 ${o.productName}`,
            `🔢 Qty · ${o.qty || 1}`,
            `💰 ${rupiah(o.amount)}`,
            `👤 ${o.tg?.name || "-"} · @${o.tg?.username || "—"} · \`${o.tg?.userId}\``,
            `⏰ ${nowWIB()}`,
          ].join("\n")
        ).catch(() => {});
        continue;
      }

      try {
        if (o.tg?.qrisMessageId) await bot.telegram.deleteMessage(o.tg.chatId, o.tg.qrisMessageId).catch(() => {});

        const d = await deliverOrder(o);
        const items = formatDelivery(o, d);

        // KIRIM DULU baru tandai delivered — item manual sudah dihapus dari stok oleh
        // takeManualStock; kalau send gagal kita simpan items agar retry tidak ambil stok baru
        await bot.telegram.sendMessage(
          o.tg.chatId,
          [
            `✅ *Pembayaran berhasil*`,
            ``,
            `🆔 \`${o.invoice}\``,
            `📦 *${o.productName}*`,
            `🔢 Qty · ${o.qty || 1}`,
            `💰 Total · *${rupiah(o.amount)}*`,
            ``,
            `🎁 *Item kamu* (ketuk & tahan untuk salin)`,
            items,
          ].join("\n"),
          { parse_mode: "Markdown" }
        );

        await bot.telegram.sendMessage(
          o.tg.chatId,
          [
            `🙏 *Terima kasih*`,
            ``,
            `Pesanan *${o.productName}* sudah kami proses.`,
            `🆔 \`${o.invoice}\` · 💰 *${rupiah(o.amount)}*`,
            ``,
            `✨ Senang bisa melayani Anda. Belanja lagi kapan saja lewat /produk.`,
          ].join("\n"),
          {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [[{ text: "🏷 Kembali ke kategori", callback_data: `cat:${catKey(o.category || "")}:0` }]] },
          }
        );

        await notifyChannel(
          [
            `✨ TRANSAKSI SUKSES ✨`,
            ``,
            `💎 ORDER LUNAS`,
            ``,
            `🧾 Invoice  · ${maskInvoice(o.invoice)}`,
            `📦 Produk   · ${o.productName}`,
            `🔢 Jumlah   · ×${o.qty || 1}`,
            `💰 Total    · ${rupiah(o.amount)}`,
            ``,
            `👤 Pembeli  • ${maskStr(o.tg?.name)}`,
            `🆔 ID       · ${maskStr(o.tg?.userId)}`,
            `⏰ Waktu    · ${clockWIB()} WIB`,
            ``,
            `✅ Stok terkirim ke customer`,
          ].join("\n")
        );

        // sukses kirim → baru tandai delivered final + bersihkan payload retry
        await q("UPDATE payment_orders SET delivered = ?, delivery_payload = NULL WHERE invoice = ?", [
          d.type === "items" ? `${d.items.length} item terkirim` : d.type === "bandel" ? "key bandel terkirim" : "gateway manual",
          o.invoice,
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        // RESET claim agar poller tick berikutnya retry (maks 5x), bukan bolong selamanya
        const attempt = Number(String(o.delivered || "").match(/^RETRY(\d+)$/)?.[1] ?? 0) + 1;
        // item manual/bandel SUDAH diambil dari stok — simpan agar retry kirim item SAMA,
        // bukan mengambil stok baru (mencegah item hilang / double provision)
        if (typeof d !== "undefined") {
          await q("UPDATE payment_orders SET delivery_payload = ? WHERE invoice = ?", [
            JSON.stringify(d),
            o.invoice,
          ]).catch(() => {});
        }
        if (attempt < 5) {
          await q("UPDATE payment_orders SET tg_delivered = 0, delivered = ? WHERE invoice = ?", [
            `RETRY${attempt}`,
            o.invoice,
          ]);
        } else {
          await q("UPDATE payment_orders SET delivered = 'GAGAL KIRIM — proses manual' WHERE invoice = ?", [o.invoice]);
          await notifyAdmin(
            [
              `🚨 *DELIVERY GAGAL 5x — PERLU MANUAL*`,
              ``,
              `🆔 \`${o.invoice}\``,
              `📦 ${o.productName} (${o.source})`,
              `💰 ${rupiah(o.amount)}`,
              `👤 ${o.tg?.name || "-"} · \`${o.tg?.userId}\``,
              `❌ Error: ${msg}`,
            ].join("\n")
          ).catch(() => {});
        }
        await bot.telegram
          .sendMessage(o.tg.chatId, `Pembayaran diterima, namun pengiriman sedang diproses ulang.\nInvoice · \`${o.invoice}\`\nMohon tunggu beberapa saat, atau hubungi admin bila lebih dari 15 menit.`, { parse_mode: "Markdown" })
          .catch(() => {});
      }
    }
  } catch (e) {
    console.error("[telegram-bot] poller error:", e.message);
  }
}, 2000);

/* ---------- launch ---------- */

console.log("[telegram-bot] starting long-polling...");
bot.telegram
  .deleteWebhook({ drop_pending_updates: true })
  .then(() => bot.launch())
  .then(() => console.log(`[telegram-bot] running · admin=${ADMIN_ID || "unset"}`))
  .catch((e) => {
    console.error("[telegram-bot] launch gagal:", e.message);
    process.exit(1);
  });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
