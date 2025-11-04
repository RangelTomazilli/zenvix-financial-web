'use client';

import { useState } from "react";
import { formatCurrency, formatDate } from "@/utils/format";
import type { TransactionType } from "@/types/database";

export interface RecentTransactionItem {
  id: string;
  description: string | null;
  categoryName: string | null;
  amount: number;
  type: TransactionType;
  occurredOn: string;
  createdBy: string | null;
}

export const RecentTransactions = ({
  data,
  currency,
}: {
  data: RecentTransactionItem[];
  currency: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">
            Últimas transações
          </h2>
          <p className="text-sm text-slate-500">
            As movimentações mais recentes registradas pela família.
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
      {isOpen ? (
        <div
          className="overflow-x-auto rounded-lg border border-slate-100"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-600">Descrição</th>
                <th className="px-4 py-3 font-medium text-slate-600">Categoria</th>
                <th className="px-4 py-3 font-medium text-slate-600">Data</th>
                <th className="px-4 py-3 font-medium text-slate-600">Responsável</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Nenhuma transação registrada.
                  </td>
                </tr>
              ) : null}
              {data.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {item.description ?? "(Sem descrição)"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {item.categoryName ?? "Sem categoria"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(item.occurredOn)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {item.createdBy ?? "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${item.type === "income" ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {item.type === "income" ? "+" : "-"} {formatCurrency(Math.abs(item.amount), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
};
