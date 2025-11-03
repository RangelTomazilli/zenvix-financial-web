import { parse, format } from "date-fns";
import { formatCurrency } from "@/utils/format";

export interface MonthlyTrendItem {
  month: string; // YYYY-MM
  income: number;
  expense: number;
}

const formatMonth = (value: string) => {
  const date = parse(value, "yyyy-MM", new Date());
  return format(date, "MMM yyyy", { locale: undefined });
};

export const MonthlyTrend = ({
  data,
  currency,
}: {
  data: MonthlyTrendItem[];
  currency: string;
}) => (
  <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <header className="mb-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Evolução mensal
        </h2>
        <p className="text-sm text-slate-500">
          Entradas e saídas nos últimos meses.
        </p>
      </div>
    </header>
    <div className="flex flex-col gap-4">
      {data.length === 0 ? (
        <p className="text-sm text-slate-500">
          Registre transações para visualizar a evolução mensal.
        </p>
      ) : null}
      {data.map((item) => {
        const balance = item.income - item.expense;
        return (
          <div
            key={item.month}
            className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium text-slate-700">
                {formatMonth(item.month)}
              </p>
              <p className="text-xs text-slate-500">
                Saldo: {formatCurrency(balance, currency)}
              </p>
            </div>
            <div className="flex gap-6 text-sm">
              <span className="font-medium text-emerald-600">
                + {formatCurrency(item.income, currency)}
              </span>
              <span className="font-medium text-rose-600">
                - {formatCurrency(item.expense, currency)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </section>
);
