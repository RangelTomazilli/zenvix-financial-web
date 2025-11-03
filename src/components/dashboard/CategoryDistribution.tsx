import { formatCurrency } from "@/utils/format";
import type { TransactionType } from "@/types/database";

export interface CategoryStat {
  id: string;
  name: string;
  total: number;
  type: TransactionType;
}

const formatPercent = (value: number) =>
  Number.isFinite(value) ? `${value.toFixed(1)}%` : "0.0%";

const SectionList = ({
  title,
  tone,
  items,
  currency,
}: {
  title: string;
  tone: "income" | "expense";
  items: CategoryStat[];
  currency: string;
}) => {
  if (items.length === 0) {
    return null;
  }

  const color = tone === "income" ? "bg-emerald-500" : "bg-rose-500";
  const total = items.reduce((sum, item) => sum + Math.abs(item.total), 0);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
        {title}
      </h3>
      {items.map((item) => {
        const percentage = total > 0 ? (Math.abs(item.total) / total) * 100 : 0;
        return (
          <div key={`${tone}-${item.id}`} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{item.name}</span>
              <span className="text-xs text-slate-500">
                {formatCurrency(item.total, currency)} • {formatPercent(percentage)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const CategoryDistribution = ({
  data,
  currency,
}: {
  data: CategoryStat[];
  currency: string;
}) => {
  const incomes = data
    .filter((item) => item.type === "income")
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  const expenses = data
    .filter((item) => item.type === "expense")
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  const totalIncome = incomes.reduce((sum, item) => sum + Math.abs(item.total), 0);
  const totalExpense = expenses.reduce((sum, item) => sum + Math.abs(item.total), 0);
  const consumption =
    totalIncome > 0 ? Math.min((totalExpense / totalIncome) * 100, 999) : 0;

  const hasIncome = totalIncome > 0;
  const hasExpense = totalExpense > 0;

  if (!hasIncome && !hasExpense) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Distribuição por categoria (mês atual)
          </h2>
          <p className="text-sm text-slate-500">
            Registre receitas e despesas para visualizar a distribuição.
          </p>
        </header>
      </section>
    );
  }

  const statusTone =
    totalIncome === 0
      ? "neutral"
      : totalExpense < totalIncome
        ? "success"
        : totalExpense > totalIncome
          ? "danger"
          : "neutral";

  const statusClasses =
    statusTone === "success"
      ? "border-emerald-200 bg-emerald-50 text-slate-700"
      : statusTone === "danger"
        ? "border-rose-200 bg-rose-50 text-slate-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  const percentageClasses =
    statusTone === "success"
      ? "text-emerald-600"
      : statusTone === "danger"
        ? "text-rose-600"
        : "text-slate-600";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-6 space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">
          Distribuição por categoria (mês atual)
        </h2>
        <p className="text-sm text-slate-500">
          Receitas e despesas analisadas separadamente para destacar a participação de
          cada categoria.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {hasIncome ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm md:w-1/2 ${statusClasses}`}
          >
            <p>
              As despesas representam{" "}
              <span className={`font-semibold ${percentageClasses}`}>
                {formatPercent(consumption)}
              </span>{" "}
              das receitas do mês.
              {totalExpense === 0 ? " Ótimo controle de gastos!" : ""}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 md:w-1/2">
            <p>
              Ainda não há receitas cadastradas neste mês — adicione entradas para
              acompanhar o consumo das despesas.
            </p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {hasIncome ? (
            <SectionList
              title="Receitas"
              tone="income"
              items={incomes}
              currency={currency}
            />
          ) : (
            <p className="rounded-md border border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-3 text-sm text-emerald-700 md:col-span-2">
              Nenhuma receita registrada neste mês.
            </p>
          )}

          {hasExpense ? (
            <SectionList
              title="Despesas"
              tone="expense"
              items={expenses}
              currency={currency}
            />
          ) : (
            <p className="rounded-md border border-dashed border-rose-200 bg-rose-50/40 px-4 py-3 text-sm text-rose-700 md:col-span-2">
              Nenhuma despesa registrada neste mês.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
