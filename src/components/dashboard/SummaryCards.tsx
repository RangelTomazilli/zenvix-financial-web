import { formatCurrency } from "@/utils/format";

interface SummaryCardsProps {
  balance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  totalTransactions: number;
  currency: string;
}

const Card = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "positive" | "negative";
}) => (
  <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <span className="text-sm font-medium text-slate-500">{label}</span>
    <span
      className={
        highlight === "positive"
          ? "text-2xl font-semibold text-emerald-600"
          : highlight === "negative"
            ? "text-2xl font-semibold text-rose-600"
            : "text-2xl font-semibold text-slate-900"
      }
    >
      {value}
    </span>
  </div>
);

export const SummaryCards = ({
  balance,
  monthlyIncome,
  monthlyExpense,
  totalTransactions,
  currency,
}: SummaryCardsProps) => (
  <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
    <Card
      label="Saldo atual"
      value={formatCurrency(balance, currency)}
      highlight={balance >= 0 ? "positive" : "negative"}
    />
    <Card
      label="Entradas do mês"
      value={formatCurrency(monthlyIncome, currency)}
      highlight="positive"
    />
    <Card
      label="Saídas do mês"
      value={formatCurrency(monthlyExpense, currency)}
      highlight="negative"
    />
    <Card
      label="Transações registradas"
      value={`${totalTransactions}`}
    />
  </section>
);
