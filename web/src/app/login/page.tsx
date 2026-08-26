import { Suspense } from "react";
import type { Metadata } from "next";
import AiNodeVisual from "@/components/AiNodeVisual";
import LoginForm from "@/components/auth/LoginForm";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = { title: "Login — NeuroForge" };

export default function LoginPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-[size:44px_44px] opacity-[0.3] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-crimson/25 blur-[110px]" />

      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="container-x relative grid min-h-dvh items-center gap-12 py-16 lg:grid-cols-2">
        <div className="hidden min-w-0 flex-col lg:flex">
          <AiNodeVisual />
          <p className="mx-auto mt-6 max-w-sm text-center font-mono text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            inference grid · 12 region · 40+ model
          </p>
        </div>

        <div className="flex min-w-0 justify-center lg:justify-end">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
