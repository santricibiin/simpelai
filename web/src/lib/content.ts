export type Feature = { icon: string; title: string; desc: string; metric: string };

export const features: Feature[] = [
  { icon: "Zap", title: "Low Latency", desc: "Edge routing dengan p95 di bawah 180ms untuk streaming token pertama.", metric: "42ms TTFB" },
  { icon: "ShieldCheck", title: "99.9% Uptime", desc: "Multi-region failover otomatis, tanpa cold start pada model aktif.", metric: "99.97% 90d" },
  { icon: "Boxes", title: "Multi-LLM Support", desc: "Satu endpoint OpenAI-compatible untuk 40+ model open & proprietary.", metric: "40+ model" },
  { icon: "Gauge", title: "High Rate Limit", desc: "Burst hingga 10k RPM dengan quota adaptif per API key.", metric: "10k RPM" },
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
    name: "Pay-as-you-go",
    price: "$0.40",
    unit: "/ 1M token",
    tagline: "Bayar hanya yang terpakai, tanpa komitmen.",
    perks: ["Semua model publik", "1k RPM", "Log 7 hari", "Community support"],
    cta: "Mulai Gratis",
  },
  {
    name: "Developer",
    price: "$49",
    unit: "/ bulan",
    tagline: "120M token termasuk, ideal untuk produksi kecil.",
    perks: ["120M token bundled", "5k RPM", "Log 30 hari + tracing", "Prioritas antrean", "Email support 24h"],
    cta: "Get API Key",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    unit: "/ kontrak",
    tagline: "Dedicated capacity dan SLA tertulis.",
    perks: ["Dedicated GPU pool", "Unlimited RPM", "SSO + audit log", "VPC peering", "SLA 99.99% & TAM"],
    cta: "Hubungi Sales",
  },
];

export const models = ["gpt-4o-mini", "claude-3.7-sonnet", "llama-3.3-70b", "qwen2.5-72b", "mistral-large"];
