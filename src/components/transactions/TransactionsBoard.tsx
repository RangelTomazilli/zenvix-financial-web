'use client';

import { useMemo, useState } from "react";
import { TextField } from "@/components/forms/TextField";
import { SelectField } from "@/components/forms/SelectField";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { formatCurrency, formatDate } from "@/utils/format";
import type { TransactionType } from "@/types/database";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface TransactionItem {
  id: string;
  amount: number;
  type: TransactionType;
  occurredOn: string;
  categoryId: string | null;
  categoryName: string | null;
  description: string | null;
  createdBy: string | null;
}

interface CategoryOption {
  id: string;
  name: string;
  type: TransactionType;
}

interface TransactionsBoardProps {
  initialTransactions: TransactionItem[];
  categories: CategoryOption[];
  currency: string;
  currentUser: string;
}

interface MessageState {
  type: "success" | "error";
  text: string;
}

interface EditingState {
  id: string;
  amount: string;
  type: TransactionType;
  occurredOn: string;
  categoryId: string;
  description: string;
}

const today = () => new Date().toISOString().split("T")[0]!;

const parseAmount = (value: string) => {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : NaN;
};

const formatAmountInput = (value: number) => value.toFixed(2).replace(".", ",");

export const TransactionsBoard = ({
  initialTransactions,
  categories,
  currency,
  currentUser,
}: TransactionsBoardProps) => {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [formType, setFormType] = useState<TransactionType>("expense");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(today());
  const [formCategory, setFormCategory] = useState("none");
  const [formDescription, setFormDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    description: string | null;
  } | null>(null);

  const filteredCategories = useMemo(
    () =>
      categories
        .filter((category) => category.type === formType)
        .map((category) => ({ label: category.name, value: category.id })),
    [categories, formType],
  );

  const editingCategories = useMemo(() => {
    if (!editing) return [];
    return categories
      .filter((category) => category.type === editing.type)
      .map((category) => ({ label: category.name, value: category.id }));
  }, [categories, editing]);

  const showMessage = (next: MessageState) => {
    setMessage(next);
    setTimeout(() => setMessage(null), 4000);
  };

  const resetCreateForm = () => {
    setFormAmount("");
    setFormDescription("");
    setFormCategory("none");
    setFormDate(today());
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const amount = parseAmount(formAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      showMessage({ type: "error", text: "Informe um valor válido." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          type: formType,
          occurredOn: formDate,
          categoryId: formCategory === "none" ? null : formCategory,
          description: formDescription,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Erro ao registrar transação.");
      }

      const payload = (await response.json()) as TransactionItem;
      setTransactions((prev) => [payload, ...prev]);
      resetCreateForm();
      showMessage({ type: "success", text: "Transação registrada com sucesso." });
    } catch (error) {
      console.error(error);
      showMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro inesperado.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (transaction: TransactionItem) => {
    setEditing({
      id: transaction.id,
      amount: formatAmountInput(Math.abs(transaction.amount)),
      type: transaction.type,
      occurredOn: transaction.occurredOn,
      categoryId: transaction.categoryId ?? "none",
      description: transaction.description ?? "",
    });
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || isUpdating) return;

    const amount = parseAmount(editing.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      showMessage({ type: "error", text: "Informe um valor válido." });
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/transactions/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          type: editing.type,
          occurredOn: editing.occurredOn,
          categoryId: editing.categoryId === "none" ? null : editing.categoryId,
          description: editing.description,
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Erro ao atualizar transação.");
      }

      const payload = (await response.json()) as TransactionItem;
      setTransactions((prev) =>
        prev.map((item) => (item.id === payload.id ? payload : item)),
      );
      setEditing(null);
      showMessage({ type: "success", text: "Transação atualizada." });
    } catch (error) {
      console.error(error);
      showMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro inesperado.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;

    setDeletingId(id);

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Erro ao excluir transação.");
      }

      setTransactions((prev) => prev.filter((item) => item.id !== id));
      showMessage({ type: "success", text: "Transação excluída." });
    } catch (error) {
      console.error(error);
      showMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro inesperado.",
      });
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4">
          <h1 className="text-xl font-semibold text-slate-900">
            Registrar transação
          </h1>
          <p className="text-sm text-slate-500">
            Preencha os dados para registrar entradas ou saídas financeiras.
          </p>
        </header>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="type"
            name="type"
            label="Tipo"
            value={formType}
            onChange={(event) => setFormType(event.target.value as TransactionType)}
            options={[
              { label: "Despesa", value: "expense" },
              { label: "Receita", value: "income" },
            ]}
            disabled={isSubmitting}
          />
          <TextField
            id="amount"
            name="amount"
            label="Valor"
            placeholder="0,00"
            inputMode="decimal"
            value={formAmount}
            onChange={(event) => setFormAmount(event.target.value)}
            disabled={isSubmitting}
            required
          />
          <TextField
            id="occurredOn"
            name="occurredOn"
            label="Data"
            type="date"
            value={formDate}
            onChange={(event) => setFormDate(event.target.value)}
            disabled={isSubmitting}
            required
          />
          <SelectField
            id="categoryId"
            name="categoryId"
            label="Categoria"
            value={formCategory}
            onChange={(event) => setFormCategory(event.target.value)}
            options={[{ label: "Sem categoria", value: "none" }, ...filteredCategories]}
            disabled={isSubmitting || filteredCategories.length === 0}
          />
          <TextAreaField
            id="description"
            name="description"
            label="Descrição"
            className="sm:col-span-2"
            value={formDescription}
            onChange={(event) => setFormDescription(event.target.value)}
            disabled={isSubmitting}
          />
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Salvando..." : "Registrar"}
            </button>
          </div>
        </form>
        {message ? (
          <p
            className={`mt-4 rounded-md px-4 py-2 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
          >
            {message.text}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Transações cadastradas
            </h2>
            <p className="text-sm text-slate-500">
              Gerencie e atualize as movimentações da família.
            </p>
          </div>
          <span className="text-sm text-slate-400">Atualizado por {currentUser}</span>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-600">Descrição</th>
                <th className="px-4 py-3 font-medium text-slate-600">Categoria</th>
                <th className="px-4 py-3 font-medium text-slate-600">Tipo</th>
                <th className="px-4 py-3 font-medium text-slate-600">Data</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Valor</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    Nenhuma transação cadastrada até o momento.
                  </td>
                </tr>
              ) : null}
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700">
                      {transaction.description ?? "(Sem descrição)"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Por {transaction.createdBy ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {transaction.categoryName ?? "Sem categoria"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${transaction.type === "income" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                    >
                      {transaction.type === "income" ? "Receita" : "Despesa"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(transaction.occurredOn)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    <span
                      className={
                        transaction.type === "income"
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }
                    >
                      {transaction.type === "income" ? "+" : "-"} {formatCurrency(Math.abs(transaction.amount), currency)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-slate-200 px-3 py-1 text-xs"
                        onClick={() => handleEdit(transaction)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-rose-200 px-3 py-1 text-xs text-rose-600"
                        onClick={() =>
                          setPendingDelete({
                            id: transaction.id,
                            description:
                              transaction.description ?? transaction.categoryName,
                          })
                        }
                        disabled={deletingId === transaction.id}
                      >
                        {deletingId === transaction.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Editar transação
            </h2>
            <p className="text-sm text-slate-500">
              Ajuste os dados e salve para atualizar o registro.
            </p>
          </header>
          <form onSubmit={handleUpdate} className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="edit-type"
              name="type"
              label="Tipo"
              value={editing.type}
              onChange={(event) =>
                setEditing((prev) =>
                  prev
                    ? {
                        ...prev,
                        type: event.target.value as TransactionType,
                        categoryId: "none",
                      }
                    : prev,
                )
              }
              options={[
                { label: "Despesa", value: "expense" },
                { label: "Receita", value: "income" },
              ]}
              disabled={isUpdating}
            />
            <TextField
              id="edit-amount"
              name="amount"
              label="Valor"
              inputMode="decimal"
              value={editing.amount}
              onChange={(event) =>
                setEditing((prev) => (prev ? { ...prev, amount: event.target.value } : prev))
              }
              disabled={isUpdating}
              required
            />
            <TextField
              id="edit-date"
              name="occurredOn"
              label="Data"
              type="date"
              value={editing.occurredOn}
              onChange={(event) =>
                setEditing((prev) =>
                  prev ? { ...prev, occurredOn: event.target.value } : prev,
                )
              }
              disabled={isUpdating}
              required
            />
            <SelectField
              id="edit-category"
              name="categoryId"
              label="Categoria"
              value={editing.categoryId}
              onChange={(event) =>
                setEditing((prev) =>
                  prev ? { ...prev, categoryId: event.target.value } : prev,
                )
              }
              options={[
                { label: "Sem categoria", value: "none" },
                ...editingCategories,
              ]}
              disabled={isUpdating || editingCategories.length === 0}
            />
            <TextAreaField
              id="edit-description"
              name="description"
              label="Descrição"
              className="sm:col-span-2"
              value={editing.description}
              onChange={(event) =>
                setEditing((prev) =>
                  prev ? { ...prev, description: event.target.value } : prev,
                )
              }
              disabled={isUpdating}
            />
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 px-4 py-2 text-sm"
                onClick={() => setEditing(null)}
                disabled={isUpdating}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
                disabled={isUpdating}
              >
                {isUpdating ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
      </section>
    ) : null}

    <ConfirmDialog
      open={pendingDelete !== null}
      title="Remover transação"
      description={
        pendingDelete
          ? `Excluir o registro ${
              pendingDelete.description
                ? `"${pendingDelete.description}"`
                : "selecionado"
            }? Esta ação não pode ser desfeita.`
          : undefined
      }
      confirmLabel="Excluir"
      confirmTone="danger"
      loading={deletingId === pendingDelete?.id}
      onCancel={() => {
        if (deletingId) return;
        setPendingDelete(null);
      }}
      onConfirm={() => {
        void confirmDelete();
      }}
    />
  </div>
);
};
