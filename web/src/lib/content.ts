export type Feature = { icon: string; title: string; desc: string; metric: string };

export const features: Feature[] = [
  { icon: "Boxes", title: "OpenAI-compatible", desc: "Endpoint /v1/chat/completions standar — SDK OpenAI, LangChain, Cline, apa pun langsung jalan.", metric: "drop-in" },
  { icon: "Zap", title: "Streaming penuh", desc: "Dukung stream: true, token mengalir realtime tanpa nunggu respons selesai.", metric: "SSE stream" },
  { icon: "Gauge", title: "Kuota transparan", desc: "Tiap request tercatat token in/out-nya. Cek sisa kuota kapan pun dari halaman Cek Kuota.", metric: "live tracking" },
  { icon: "ShieldCheck", title: "API key aman", desc: "Key kamu di-hash, bisa dicabut sendiri, dan punya rate limit terpisah per key.", metric: "revocable" },
];

export type Step = { n: string; title: string; desc: string };

export const steps: Step[] = [
  {
    n: "01",
    title: "Pilih paket token",
    desc: "Buka daftar harga, tentukan besaran token sesuai kebutuhan proyek kamu.",
  },
  {
    n: "02",
    title: "Bayar via QRIS",
    desc: "Scan QRIS dari halaman order atau bot Telegram. Konfirmasi otomatis, tanpa nunggu admin.",
  },
  {
    n: "03",
    title: "Terima API key",
    desc: "API key langsung dikirim setelah pembayaran masuk. Simpan — key hanya ditampilkan sekali.",
  },
  {
    n: "04",
    title: "Ganti base URL",
    desc: "Di kode kamu, arahkan base URL ke gateway kami dan pakai API key itu sebagai Bearer token.",
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
