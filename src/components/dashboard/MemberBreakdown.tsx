'use client';

import { useState } from "react";
import { formatCurrency } from "@/utils/format";

const formatPercent = (value: number) =>
  Number.isFinite(value) ? `${value.toFixed(1)}%` : "0.0%";

export interface MemberContribution {
  id: string;
  name: string | null;
  email: string | null;
  income: number;
  expense: number;
  incomeShare: number;
  expenseShare: number;
}

export const MemberBreakdown = ({
  data,
  currency,
}: {
  data: MemberContribution[];
  currency: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const Header = (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">
          Contribuição por pessoa
        </h2>
        <p className="text-sm text-slate-500">
          Receitas, despesas e saldo mensal agrupados por integrante da família.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="mt-1 flex items-center justify-center text-slate-600 transition hover:text-indigo-600 sm:mt-0 sm:h-9 sm:w-9 sm:rounded-full sm:border sm:border-slate-200 sm:hover:border-indigo-400"
        aria-expanded={isOpen}
      >
        <span className="sr-only">Alternar exibição</span>
        <span
          aria-hidden="true"
          className={`text-lg transition-transform ${isOpen ? "rotate-90" : "-rotate-90"}`}
        >
          ›
        </span>
      </button>
    </header>
  );

  if (data.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {Header}
        {isOpen ? (
          <p className="text-sm text-slate-500">
            Registre receitas ou despesas associando um membro da família para acompanhar
            quem contribui mais com o orçamento.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {Header}

      {isOpen ? (
        <div className="flex flex-col gap-5">
          {data.map((member) => {
            const displayName = member.name ?? member.email ?? "Membro sem nome";
            const net = member.income - member.expense;
            const tone =
              net > 0 ? "positive" : net < 0 ? "negative" : "neutral";
            const netClasses =
              tone === "positive"
                ? "text-emerald-600"
                : tone === "negative"
                  ? "text-rose-600"
                  : "text-slate-600";
            const badgeClasses =
              tone === "positive"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : tone === "negative"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-slate-100 text-slate-600 border-slate-200";

            return (
              <div
                key={member.id}
                className="rounded-lg border border-slate-100 bg-slate-50/60 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      Integrante
                    </p>
                    <h3 className="text-base font-semibold text-slate-800">
                      {displayName}
                    </h3>
                    {member.email ? (
                      <p className="text-xs text-slate-500">{member.email}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 text-sm sm:items-end sm:text-right">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${badgeClasses}`}
                    >
                      {tone === "positive"
                        ? "Superávit"
                        : tone === "negative"
                          ? "Déficit"
                          : "Equilíbrio"}
                    </span>
                    <div>
                      <p className="text-xs text-slate-500">Saldo no mês</p>
                      <p className={`text-lg font-semibold ${netClasses}`}>
                        {formatCurrency(net, currency)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2 rounded-md bg-white/60 p-3">
                    <div className="flex items-center justify-between text-sm font-medium text-slate-600">
                      <span>Receitas</span>
                      <span>{formatPercent(member.incomeShare)}</span>
                    </div>
                    <p className="text-base font-semibold text-emerald-600">
                      {formatCurrency(member.income, currency)}
                    </p>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${Math.min(member.incomeShare, 100).toFixed(1)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 rounded-md bg-white/60 p-3">
                    <div className="flex items-center justify-between text-sm font-medium text-slate-600">
                      <span>Despesas</span>
                      <span>{formatPercent(member.expenseShare)}</span>
                    </div>
                    <p className="text-base font-semibold text-rose-600">
                      {formatCurrency(member.expense, currency)}
                    </p>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-rose-500"
                        style={{
                          width: `${Math.min(member.expenseShare, 100).toFixed(1)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};
