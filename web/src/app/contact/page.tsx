import type { Metadata } from "next";
import { MailQuestion } from "lucide-react";
import MemberHeader from "@/components/member/MemberHeader";
import { getContact } from "@/lib/contact";
import { getSettings } from "@/lib/session";

export const metadata: Metadata = { title: "Contact" };
export const dynamic = "force-dynamic";

function TelegramIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

export default async function ContactPage() {
  const [settings, contact] = await Promise.all([getSettings(), getContact()]);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-[size:44px_44px] opacity-15 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-crimson/15 blur-[110px]" />
      <MemberHeader siteName={settings.site_name} />

      <main className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl space-y-6">
          <div className="text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-crimson/10">
              <MailQuestion className="h-6 w-6 text-crimson-500" />
            </span>
            <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Hubungi Kami</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Ada pertanyaan soal kuota, API key, atau pembelian? Hubungi lewat kanal di bawah — balasan cepat di jam kerja.
            </p>
          </div>

          <div className="grid gap-4">
            {contact.telegram && (
              <a
                href={`https://t.me/${contact.telegram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="glass group flex items-center gap-4 p-5 transition hover:border-crimson-500/40"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-400 transition group-hover:scale-105">
                  <TelegramIcon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Telegram</span>
                  <span className="block truncate font-mono text-xs text-slate-500 dark:text-slate-400">@{contact.telegram}</span>
                </span>
                <span className="shrink-0 rounded-lg border border-slate-900/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400 transition group-hover:border-crimson-500 group-hover:text-crimson-500 dark:border-white/15">
                  buka
                </span>
              </a>
            )}

            {contact.whatsapp && (
              <a
                href={`https://wa.me/${contact.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="glass group flex items-center gap-4 p-5 transition hover:border-crimson-500/40"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 transition group-hover:scale-105">
                  <WhatsAppIcon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">WhatsApp</span>
                  <span className="block truncate font-mono text-xs text-slate-500 dark:text-slate-400">+{contact.whatsapp}</span>
                </span>
                <span className="shrink-0 rounded-lg border border-slate-900/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400 transition group-hover:border-crimson-500 group-hover:text-crimson-500 dark:border-white/15">
                  buka
                </span>
              </a>
            )}

            {!contact.telegram && !contact.whatsapp && (
              <p className="glass p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Kanal kontak belum dikonfigurasi. Admin bisa mengaturnya di halaman Provider → Kontak Member.
              </p>
            )}
          </div>

          <p className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
            {settings.site_name} · member support
          </p>
        </div>
      </main>
    </div>
  );
}
