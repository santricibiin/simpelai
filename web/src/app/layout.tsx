import type { Metadata } from "next";
import { Sora, Manrope, IBM_Plex_Mono } from "next/font/google";
import { getSettings } from "@/lib/session";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"] });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export async function generateMetadata(): Promise<Metadata> {
  const { site_name, site_tagline } = await getSettings();
  return { title: `${site_name} — ${site_tagline}`, description: site_tagline };
}

const themeScript = `try{var t=localStorage.getItem('nf-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${sora.variable} ${manrope.variable} ${mono.variable} font-sans`}>{children}</body>
    </html>
  );
}
