'use client';

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transações" },
  { href: "/credit-cards", label: "Cartões" },
  { href: "/categories", label: "Categorias" },
  { href: "/family", label: "Família" },
  { href: "/profile", label: "Perfil" },
];

interface NavigationProps {
  mobileExtra?: React.ReactNode;
}

export const Navigation = ({ mobileExtra }: NavigationProps) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:w-auto">
      <button
        type="button"
        aria-controls="nav-links"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 md:hidden"
      >
        <span className="sr-only">
          {open ? "Fechar menu de navegação" : "Abrir menu de navegação"}
        </span>
        <span
          className={clsx(
            "relative block h-4 w-5",
            open ? "text-indigo-600" : "text-slate-600",
          )}
        >
          <span
            className={clsx(
              "absolute left-0 top-0 h-0.5 w-full rounded-full bg-current transition transform",
              open ? "translate-y-1.5 rotate-45" : "",
            )}
          />
          <span
            className={clsx(
              "absolute left-0 top-1.5 h-0.5 w-full rounded-full bg-current transition",
              open ? "opacity-0" : "opacity-100",
            )}
          />
          <span
            className={clsx(
              "absolute left-0 top-3 h-0.5 w-full rounded-full bg-current transition transform",
              open ? "-translate-y-1.5 -rotate-45" : "",
            )}
          />
        </span>
      </button>
      <nav
        id="nav-links"
        className={clsx(
          "flex flex-col gap-2 md:flex-row md:items-center md:gap-2",
          open ? "flex" : "hidden md:flex",
          "absolute right-0 top-12 z-40 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-md md:static md:z-auto md:w-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none",
        )}
      >
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "rounded-md px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          );
        })}
        {mobileExtra}
      </nav>
    </div>
  );
};
