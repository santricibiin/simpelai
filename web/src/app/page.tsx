import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Playground from "@/components/Playground";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import { getSettings } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { site_name } = await getSettings();

  return (
    <>
      <Navbar siteName={site_name} />
      <main>
        <Hero />
        <Playground />
        <Features />
        <Pricing />
      </main>
      <Footer siteName={site_name} />
    </>
  );
}
