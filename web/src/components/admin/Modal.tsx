"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  tone = "default",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  tone?: "default" | "danger";
}) {
  const panel = useRef<HTMLDivElement>(null);
  // simpan onClose di ref agar effect tidak re-run saat parent re-render
  // (re-run akan mencuri fokus dari input yang sedang diketik)
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };

    document.addEventListener("keydown", onKey);
    const first = panel.current?.querySelector<HTMLElement>("input, button");
    first?.focus();

    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0"
        aria-hidden="true"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-slate-900/10 bg-offwhite p-5 shadow-2xl dark:border-white/10 dark:bg-slateDeep-800"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2
              className={`font-display text-base font-semibold tracking-tight ${
                tone === "danger" ? "text-crimson-500" : ""
              }`}
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-900/10 transition hover:border-crimson-500 hover:text-crimson-500 dark:border-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children && <div className="mt-4">{children}</div>}

        {footer && (
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
        )}
      </div>
    </div>
  );
}
