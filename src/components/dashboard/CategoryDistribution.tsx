import { formatCurrency } from "@/utils/format";
import type { TransactionType } from "@/types/database";

export interface CategoryStat {
  id: string;
  name: string;
  total: number;
  type: TransactionType;
}

export const CategoryDistribution = ({
  data,
  currency,
}: {
  data: CategoryStat[];
  currency: string;
}) => {
  const total = data.reduce((acc, item) => acc + Math.abs(item.total), 0);

  if (total === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Distribuição por categoria (mês atual)
          </h2>
          <p className="text-sm text-slate-500">
            Registre transações para visualizar a distribuição.
          </p>
        </header>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Distribuição por categoria (mês atual)
        </h2>
        <p className="text-sm text-slate-500">
          Percentual das categorias considerando entradas e saídas.
        </p>
      </header>
      <div className="flex flex-col gap-3">
        {data.map((item) => {
          const percentage = (Math.abs(item.total) / total) * 100;
          return (
            <div key={item.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{item.name}</span>
                <span className="text-xs text-slate-500">
                  {formatCurrency(item.total, currency)} • {percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${item.type === "income" ? "bg-emerald-500" : "bg-rose-500"}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
