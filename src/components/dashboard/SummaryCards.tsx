import { clsx } from "clsx";
import { formatCurrency } from "@/utils/format";

interface SummaryCardsProps {
  balance: number;
  monthlyIncome: number;
  monthlyExpenseTotal: number;
  installmentTotal: number;
  totalTransactions: number;
  currency: string;
}

const CardShell = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={clsx(
      "flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5",
      className,
    )}
  >
    {children}
  </div>
);

export const SummaryCards = ({
  balance,
  monthlyIncome,
  monthlyExpenseTotal,
  installmentTotal,
  totalTransactions,
  currency,
}: SummaryCardsProps) => (
  <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
    <CardShell>
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Saldo atual
        </span>
        <p
          className={
            balance >= 0
              ? "mt-1 text-xl md:text-3xl font-semibold text-emerald-600"
              : "mt-1 text-xl md:text-3xl font-semibold text-rose-600"
          }
        >
          {formatCurrency(balance, currency)}
        </p>
      </div>
      <div
        className={
          balance >= 0
            ? "rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-600/90"
            : "rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600/90"
        }
      >
        <span className="font-medium">
          Entradas do mês:{" "}
        </span>
        <span className="font-semibold">
          {formatCurrency(monthlyIncome, currency)}
        </span>
      </div>
    </CardShell>

    <CardShell>
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Saídas totais
        </span>
        <p className="mt-1 text-xl md:text-3xl font-semibold text-rose-600">
          {formatCurrency(monthlyExpenseTotal, currency)}
        </p>
      </div>
      <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600/90">
        <span className="font-medium">Parcelas do mês: </span>
        <span className="font-semibold">
          {formatCurrency(installmentTotal, currency)}
        </span>
      </div>
    </CardShell>

    <CardShell className="hidden lg:flex">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Transações registradas
      </span>
      <p className="mt-1 text-xl md:text-3xl font-semibold text-indigo-600">
        {totalTransactions}
      </p>
      <p className="text-sm text-slate-500">
        Quantidade total de lançamentos no período filtrado.
      </p>
    </CardShell>
  </section>
);
