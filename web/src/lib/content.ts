export type Feature = { icon: string; title: string; desc: string; metric: string };

export const features: Feature[] = [
  { icon: "Boxes", title: "Semua model, satu kuota", desc: "Kuota dihitung dari total pemakaian lintas model, bukan per model. Bebas ganti model kapan saja.", metric: "satu kuota" },
  { icon: "Zap", title: "Format OpenAI", desc: "Endpoint /v1/chat/completions standar. SDK OpenAI, LangChain, Cline, Cursor — langsung jalan.", metric: "drop-in" },
  { icon: "Gauge", title: "Pembayaran instan", desc: "QRIS dari semua bank dan e-wallet. Verifikasi otomatis, API key terkirim begitu pembayaran masuk.", metric: "otomatis" },
  { icon: "ShieldCheck", title: "Tanpa akun, tetap aman", desc: "Tidak perlu daftar. Key di-hash, bisa dicabut sendiri, rate limit terpisah per key.", metric: "no signup" },
];

export type Step = { n: string; title: string; desc: string };

export const steps: Step[] = [
  {
    n: "01",
    title: "Pilih paket",
    desc: "Tentukan kuota yang sesuai kebutuhan. Tidak perlu buat akun.",
  },
  {
    n: "02",
    title: "Bayar lewat QRIS",
    desc: "Scan dari semua bank dan e-wallet. Verifikasi otomatis, tanpa nunggu admin.",
  },
  {
    n: "03",
    title: "Terima API key",
    desc: "Key dan base URL langsung terkirim begitu pembayaran masuk. Simpan — hanya ditampilkan sekali.",
  },
  {
    n: "04",
    title: "Ganti base URL",
    desc: "Arahkan base URL ke gateway, pakai key sebagai Bearer token. Sebut nama modelnya di request — selesai.",
  },
];

export const snippets: { lang: string; label: string; code: string }[] = [
  {
    lang: "bash",
    label: "cURL",
    code: `curl https://buatprem.biz.id/v1/chat/completions \\
  -H "Authorization: Bearer sk-nf-xxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gcli/grok-4.6",
    "messages": [{"role": "user", "content": "Halo"}]
  }'`,
  },
  {
    lang: "python",
    label: "Python",
    code: `from openai import OpenAI

client = OpenAI(
    api_key="sk-nf-xxxxx",
    base_url="https://buatprem.biz.id/v1",
)

res = client.chat.completions.create(
    model="gcli/grok-4.6",
    messages=[{"role": "user", "content": "Halo"}],
)
print(res.choices[0].message.content)`,
  },
  {
    lang: "javascript",
    label: "Node.js",
    code: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "sk-nf-xxxxx",
  baseURL: "https://buatprem.biz.id/v1",
});

const res = await client.chat.completions.create({
  model: "gcli/grok-4.6",
  messages: [{ role: "user", content: "Halo" }],
});
console.log(res.choices[0].message.content);`,
  },
];

export const models = ["gcli/grok-4.6", "gcli/grok-4.6-xhigh"];
