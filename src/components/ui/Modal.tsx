'use client';

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";

type ModalSize = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  closeOnOverlay?: boolean;
  showCloseButton?: boolean;
}

export const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "lg",
  closeOnOverlay = true,
  showCloseButton = true,
}: ModalProps) => {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      setAnimating(true);
    });

    return () => {
      cancelAnimationFrame(frame);
      setAnimating(false);
    };
  }, [open]);

  const isBrowser = typeof window !== "undefined";
  if (!isBrowser) {
    return null;
  }

  const handleOverlayClick = () => {
    if (closeOnOverlay) {
      onClose();
    }
  };

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className={clsx(
        "fixed inset-0 z-[999] flex items-end justify-center px-2 py-4 sm:items-center sm:px-4 sm:py-8",
        "pointer-events-auto",
      )}
      aria-hidden={false}
    >
      <div
        className={clsx(
          "absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 ease-out",
          animating ? "opacity-100" : "opacity-0",
        )}
        onClick={handleOverlayClick}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className={clsx(
          "relative w-full max-h-[92vh] transform overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 ease-out sm:w-auto sm:max-h-[85vh] sm:rounded-2xl",
          sizeClass[size],
          animating
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 sm:translate-y-16",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-6 p-6">
          {(title || showCloseButton) && (
            <header className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                {title ? (
                  <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p className="text-sm text-slate-500">{description}</p>
                ) : null}
              </div>
              {showCloseButton ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-500 transition hover:border-rose-300 hover:text-rose-500"
                >
                  Fechar
                </button>
              ) : null}
            </header>
          )}
          <div>{children}</div>
          {footer ? <footer>{footer}</footer> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
};
