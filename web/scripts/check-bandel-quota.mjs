// Cek createOrder menolak produk bandel yang melebihi kuota reseller.
// Jalankan: node --env-file=.env scripts/check-bandel-quota.mjs
import mysql from "mysql2/promise";

const KEY = process.env.RESELLER_API_KEY;
const BASE = process.env.RESELLER_API_URL || "https://bandelbanget.xyz";

const r = await fetch(`${BASE}/api/reseller/v1/quota`, {
  headers: { Authorization: `Bearer ${KEY}` },
});
const q = await r.json();
console.log("kuota reseller :", q.quota?.toLocaleString("id-ID"));

// simulasi logika createOrder untuk 2 kasus
const kasus = [
  { nama: "dalam kuota", tokens: 5_000_000, qty: 1 },
  { nama: "lewat kuota", tokens: 100_000_000_000, qty: 1 },
];

for (const k of kasus) {
  const perlu = k.tokens * k.qty;
  const tolak = typeof q.quota === "number" && q.quota < perlu;
  console.log(
    `${tolak ? "DITOLAK " : "DITERIMA"} ${k.nama.padEnd(12)} butuh ${perlu.toLocaleString("id-ID").padStart(16)}`,
  );
}

// verifikasi query getPublicProducts memang menyertakan source
const pool = mysql.createPool({ uri: process.env.DATABASE_URL });
const [rows] = await pool.query(
  `SELECT id, name, source, tokens FROM products
   WHERE enabled = 1 AND (source = 'bandel' OR stock IS NULL OR stock > 0)`,
);
console.log("\nproduk publik:");
for (const p of rows) {
  const kurang = p.source === "bandel" && typeof q.quota === "number" && Number(p.tokens) > q.quota;
  console.log(`  ${kurang ? "HABIS    " : "TERSEDIA "} ${p.source.padEnd(8)} ${p.name}`);
}
await pool.end();
