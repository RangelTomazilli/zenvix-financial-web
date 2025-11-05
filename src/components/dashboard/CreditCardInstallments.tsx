import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/utils/format";

export interface CreditCardInstallmentItem {
  id: string;
  cardId: string;
  cardName: string;
  description: string | null;
  merchant: string | null;
  amount: number;
  status: "pending" | "billed" | "paid" | "cancelled";
  dueDate: string;
  installmentNumber: number;
  totalInstallments: number;
  category?: { id: string; name: string; type: "income" | "expense" } | null;
  profile?: { id: string; full_name: string | null; email: string | null } | null;
}

const statusBadge: Record<
  CreditCardInstallmentItem["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Prevista",
    className: "bg-slate-100 text-slate-600",
  },
  billed: {
    label: "Faturada",
    className: "bg-amber-50 text-amber-600",
  },
  paid: {
    label: "Paga",
    className: "bg-emerald-50 text-emerald-600",
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-rose-50 text-rose-500",
  },
};

const formatDate = (value: string) =>
  format(new Date(value), "dd/MM/yyyy", { locale: ptBR });

interface CreditCardInstallmentsProps {
  data: CreditCardInstallmentItem[];
  currency: string;
}

export const CreditCardInstallments = ({
  data,
  currency,
}: CreditCardInstallmentsProps) => {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-900">
          Parcelas de cartões no mês
        </h2>
        <p className="text-sm text-slate-500">
          Valores de faturas parceladas cujo vencimento ocorre no mês selecionado.
        </p>
      </header>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nenhuma parcela prevista para este mês.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Cartão
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Descrição
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Parcela
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Vencimento
                </th>
                <th className="px-4 py-3 font-medium text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((item) => {
                const badge = statusBadge[item.status];
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {item.cardName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.description ?? item.merchant ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.installmentNumber}/{item.totalInstallments}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(item.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {formatCurrency(item.amount, currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
