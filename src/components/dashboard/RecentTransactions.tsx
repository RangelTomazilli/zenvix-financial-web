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
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const filteredData =
    filter === "all"
      ? data
      : data.filter((item) => item.type === filter);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">
            Últimas transações
          </h2>
          <p className="text-sm text-slate-500">
            As movimentações mais recentes registradas pela família.
          </p>
        </div>
        <div className="flex items-center gap-3 self-end lg:self-auto">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1 text-xs font-medium text-slate-600">
            {[
              { value: "all", label: "Todas" },
              { value: "income", label: "Entradas" },
              { value: "expense", label: "Saídas" },
            ].map((option) => {
              const active = filter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value as typeof filter)}
                  className={`rounded-full px-3 py-1 transition ${
                    active
                      ? option.value === "income"
                        ? "bg-emerald-500 text-white shadow-sm"
                        : option.value === "expense"
                          ? "bg-rose-500 text-white shadow-sm"
                          : "bg-indigo-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
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
        </div>
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
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    {filter === "all"
                      ? "Nenhuma transação registrada."
                      : "Nenhuma transação encontrada para o filtro selecionado."}
                  </td>
                </tr>
              ) : null}
              {filteredData.map((item) => (
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
