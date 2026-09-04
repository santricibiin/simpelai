export type Feature = { icon: string; title: string; desc: string; metric: string };

export const features: Feature[] = [
  { icon: "Boxes", title: "Smart routing", desc: "Request otomatis dirutekan ke provider dan model terbaik yang tersedia — failover tanpa kamu sentuh.", metric: "auto-route" },
  { icon: "Zap", title: "Satu endpoint", desc: "Endpoint /v1/chat/completions format OpenAI. Semua model di belakang gateway, tanpa ganti SDK.", metric: "drop-in" },
  { icon: "Gauge", title: "Kuota transparan", desc: "Tiap request tercatat token in/out-nya per model. Cek sisa kuota realtime kapan pun.", metric: "live tracking" },
  { icon: "ShieldCheck", title: "API key aman", desc: "Key di-hash, bisa dicabut sendiri, rate limit terpisah per key — kontrol penuh di tanganmu.", metric: "revocable" },
];

export type Step = { n: string; title: string; desc: string };

export const steps: Step[] = [
  {
    n: "01",
    title: "Pilih paket kuota",
    desc: "Beli paket token lewat QRIS. Kuota itu yang dipakai semua request yang lewat gateway.",
  },
  {
    n: "02",
    title: "Terima API key",
    desc: "API key langsung dikirim setelah pembayaran masuk. Simpan — key hanya ditampilkan sekali.",
  },
  {
    n: "03",
    title: "Ganti base URL",
    desc: "Arahkan base URL ke gateway kami, pakai API key sebagai Bearer token. Format tetap OpenAI.",
  },
  {
    n: "04",
    title: "Request langsung dirutekan",
    desc: "Sebut nama model di request, gateway merutekannya ke provider terbaik. Ganti model = ganti satu baris.",
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
