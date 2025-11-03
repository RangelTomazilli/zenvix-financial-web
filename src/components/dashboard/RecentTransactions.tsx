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
}) => (
  <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <header className="mb-4">
      <h2 className="text-lg font-semibold text-slate-900">
        Últimas transações
      </h2>
      <p className="text-sm text-slate-500">
        As movimentações mais recentes registradas pela família.
      </p>
    </header>
    <div className="overflow-hidden rounded-lg border border-slate-100">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium text-slate-600">Descrição</th>
            <th className="px-4 py-3 font-medium text-slate-600">Categoria</th>
            <th className="px-4 py-3 font-medium text-slate-600">Data</th>
            <th className="px-4 py-3 font-medium text-slate-600">Responsável</th>
            <th className="px-4 py-3 font-medium text-slate-600 text-right">Valor</th>
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
  </section>
);
