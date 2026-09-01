import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(WEB, "data");

const env = fs.readFileSync(path.join(WEB, ".env"), "utf8");
const dbUrl =
  env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim() ||
  "mysql://neuroforge:9138d307ba0f9c917632fbc5a00e283f@127.0.0.1:3306/neuroforge";

const pool = mysql.createPool({ uri: dbUrl });

const readJSON = (f, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));
  } catch {
    return fallback;
  }
};

async function main() {
  // 1. app_settings (payment-settings, contact, bandel-domain, telegram config)
  for (const [key, file] of [
    ["payment", "payment-settings.json"],
    ["contact", "contact.json"],
    ["bandel-domain", "bandel-domain.json"],
    ["telegram", "telegram.json"],
  ]) {
    const data = readJSON(file, null);
    if (!data) continue;
    delete data.pid;
    await pool.query(
      "INSERT INTO app_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [key, JSON.stringify(data)]
    );
    console.log(`app_settings[${key}] ✓`);
  }

  // 2. products
  const products = readJSON("products.json", []);
  for (const p of products) {
    await pool.query(
      `INSERT INTO products (id, name, source, tier_id, category, product_code, tokens, valid_days, price, enabled, stock, sold_count, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [
        p.id, p.name, p.source, p.tierId ?? null, p.category ?? null, p.productCode ?? null,
        p.tokens ?? 0, p.validDays ?? 0, p.price ?? 0, p.enabled ? 1 : 0,
        p.source === "manual" ? (p.stockItems?.length ?? 0) : (p.stock ?? null),
        p.soldCount ?? 0, new Date(p.createdAt ?? Date.now()),
      ]
    );
    // stok manual
    if (p.source === "manual" && Array.isArray(p.stockItems)) {
      for (const item of p.stockItems) {
        await pool.query(
          "INSERT IGNORE INTO product_stocks (product_id, value) VALUES (?, ?)",
          [p.id, item]
        );
      }
    }
    console.log(`products[${p.id}] ${p.name} ✓ (stok: ${p.stockItems?.length ?? p.stock ?? 0})`);
  }

  // 3. payment orders
  const orders = readJSON("payment-orders.json", []);
  for (const o of orders) {
    await pool.query(
      `INSERT IGNORE INTO payment_orders
       (invoice, status, amount, unique_code, product_id, product_name, tokens, valid_days, source, tier_id, category, product_code, buyer_token, qty, qris_payload, tg_user_id, tg_chat_id, tg_name, tg_username, tg_qris_message_id, tg_delivered, event_id, delivered, created_at, expires_at, paid_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        o.invoice, o.status, o.amount, o.uniqueCode ?? 0, o.productId ?? null, o.productName,
        o.tokens ?? 0, o.validDays ?? 0, o.source, o.tierId ?? null, o.category ?? null, o.productCode ?? null,
        o.buyerToken || null, o.qty ?? 1, o.qrisPayload ?? null,
        o.tg?.userId ?? null, o.tg?.chatId ?? null, o.tg?.name ?? null, o.tg?.username ?? null,
        o.tg?.qrisMessageId ?? null, o.tgDelivered ? 1 : 0, o.eventId ?? null, o.delivered ?? null,
        new Date(o.createdAt), new Date(o.expiresAt), o.paidAt ? new Date(o.paidAt) : null,
      ]
    );
  }
  console.log(`payment_orders ✓ (${orders.length})`);

  // 4. payment events
  const events = readJSON("payment-events.json", []);
  for (const e of events) {
    await pool.query(
      "INSERT IGNORE INTO payment_events (event_key, amount, matched, created_at) VALUES (?,?,?,?)",
      [e.eventKey, e.amount, e.matched ? 1 : 0, new Date(e.createdAt)]
    );
  }
  console.log(`payment_events ✓ (${events.length})`);

  // 5. telegram members
  const members = readJSON("telegram-members.json", []);
  for (const m of members) {
    await pool.query(
      `INSERT INTO telegram_members (user_id, name, username, joined_at, last_seen) VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [m.userId, m.name, m.username, new Date(m.joinedAt), new Date(m.lastSeen ?? m.joinedAt)]
    );
  }
  console.log(`telegram_members ✓ (${members.length})`);

  await pool.end();
  console.log("\nMIGRASI SELESAI — semua data JSON sudah di MySQL.");
}

main().catch((e) => {
  console.error("MIGRASI GAGAL:", e.message);
  process.exit(1);
});
