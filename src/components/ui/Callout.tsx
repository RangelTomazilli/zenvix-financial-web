'use client';

import { clsx } from "clsx";
import { useEffect, useState } from "react";

type CalloutTone = "success" | "info" | "warning" | "error";

interface CalloutProps {
  tone?: CalloutTone;
  title?: string;
  description?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  /**
   * When defined, the callout becomes transient and auto-dismisses after the given ms.
   */
  autoCloseAfter?: number;
  children?: React.ReactNode;
}

const toneStyles: Record<CalloutTone, string> = {
  success:
    "border-emerald-300 bg-gradient-to-r from-emerald-100 via-emerald-50 to-white text-emerald-800 shadow-[0_20px_40px_-30px_rgba(16,185,129,0.9)]",
  info: "border-sky-200 bg-sky-50 text-sky-800 shadow-sky-100/80",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 shadow-amber-100/80",
  error: "border-rose-200 bg-rose-50 text-rose-800 shadow-rose-100/80",
};

export const Callout = ({
  tone = "info",
  title,
  description,
  dismissible = false,
  autoCloseAfter,
  onDismiss,
  children,
}: CalloutProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!autoCloseAfter) return;
    if (!visible) return;
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, autoCloseAfter);
    return () => window.clearTimeout(timer);
  }, [autoCloseAfter, onDismiss, visible]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={clsx(
        "relative rounded-2xl border px-5 py-4 text-sm shadow-sm",
        toneStyles[tone],
      )}
    >
      <div className="space-y-2 pr-6">
        {title ? (
          <p className="text-sm font-semibold leading-5">{title}</p>
        ) : null}
        {description ? <p className="leading-relaxed">{description}</p> : null}
        {children}
      </div>
      {dismissible ? (
        <button
          type="button"
          className="absolute right-3 top-3 rounded-full bg-white/40 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-white/70"
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
        >
          Fechar
        </button>
      ) : null}
    </div>
  );
};
