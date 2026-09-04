import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // akses dev server via domain produksi tanpa mematikan HMR/devtools
  allowedDevOrigins: ["buatprem.biz.id", "www.buatprem.biz.id"],
  async redirects() {
    return [{ source: "/admin/bandel", destination: "/admin/provider", permanent: true }];
  },
};

export default nextConfig;
