import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Integrasi from "@/components/Integrasi";
import Features from "@/components/Features";
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
        <HowItWorks />
        <Integrasi />
        <Features />
      </main>
      <Footer siteName={site_name} />
    </>
  );
}
