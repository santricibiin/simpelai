export type Feature = { icon: string; title: string; desc: string; metric: string };

export const features: Feature[] = [
  { icon: "Zap", title: "Streaming Cepat", desc: "Respons model lancar untuk chatbot, automation, dan proyek AI kamu.", metric: "Realtime" },
  { icon: "ShieldCheck", title: "Stok Selalu Tersedia", desc: "Paket token dikirim otomatis setelah pembayaran QRIS terkonfirmasi.", metric: "Delivery Instan" },
  { icon: "Boxes", title: "Model Pilihan", desc: "Grok dan model populer lainnya, satu API key untuk semuanya.", metric: "Grok & more" },
  { icon: "Gauge", title: "Kuota Transparan", desc: "Pemakaian token tercatat per request — bisa dipantau kapan saja.", metric: "Live Tracking" },
];

export type Plan = {
  name: string;
  price: string;
  unit: string;
  tagline: string;
  perks: string[];
  cta: string;
  featured?: boolean;
};

export const plans: Plan[] = [
  {
    name: "Paket 5 Juta",
    price: "Rp10.000",
    unit: "",
    tagline: "Cocok buat coba-coba dan proyek kecil.",
    perks: ["5.000.000 token", "Semua model aktif", "Dashboard pemakaian", "Support via WhatsApp/Telegram"],
    cta: "Pesan Paket",
  },
  {
    name: "Paket 200 Juta",
    price: "Rp150.000",
    unit: "",
    tagline: "Paling laris — buat penggunaan harian rutin.",
    perks: ["200.000.000 token", "Semua model aktif", "Dashboard pemakaian", "Prioritas support"],
    cta: "Pesan Paket",
    featured: true,
  },
  {
    name: "Paket 10 Miliar",
    price: "Rp5.000.000",
    unit: "",
    tagline: "Untuk tim dan produk dengan traffic besar.",
    perks: ["10.000.000.000 token", "Semua model aktif", "Dashboard pemakaian", "Support prioritas tertinggi"],
    cta: "Pesan Paket",
  },
];

export const models = ["gcli/grok-4.6", "gcli/grok-4.6-xhigh"];

export const extras = [
  { name: "Netflix Premium 1 Bulan", desc: "Akun streaming legal, garansi full 1 bulan.", price: "Rp25.000" },
];
