'use client';

import { useState } from "react";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import type { TransactionType } from "@/types/database";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface CategoryItem {
  id: string;
  name: string;
  type: TransactionType;
}

interface CategoriesBoardProps {
  initialCategories: CategoryItem[];
}

interface MessageState {
  type: "success" | "error";
  text: string;
}

export const CategoriesBoard = ({
  initialCategories,
}: CategoriesBoardProps) => {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [message, setMessage] = useState<MessageState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState<TransactionType>("expense");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const showMessage = (next: MessageState) => {
    setMessage(next);
    setTimeout(() => setMessage(null), 3500);
  };

  const resetForm = () => {
    setName("");
    setType("expense");
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Erro ao criar categoria.");
      }

      const payload = (await response.json()) as CategoryItem;
      setCategories((prev) => [...prev, payload]);
      resetForm();
      showMessage({ type: "success", text: "Categoria criada com sucesso." });
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

  const startEditing = (category: CategoryItem) => {
    setEditingId(category.id);
    setDraftName(category.name);
    setDraftType(category.type);
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId || !draftName.trim()) {
      return;
    }

    setLoadingId(editingId);

    try {
      const response = await fetch(`/api/categories/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draftName, type: draftType }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Erro ao atualizar categoria.");
      }

      const payload = (await response.json()) as CategoryItem;
      setCategories((prev) =>
        prev.map((item) => (item.id === payload.id ? payload : item)),
      );
      setEditingId(null);
      showMessage({ type: "success", text: "Categoria atualizada." });
    } catch (error) {
      console.error(error);
      showMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro inesperado.",
      });
    } finally {
      setLoadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    const { id } = pendingDelete;
    setLoadingId(id);

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Erro ao excluir categoria.");
      }

      setCategories((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) {
        setEditingId(null);
      }
      showMessage({ type: "success", text: "Categoria removida." });
    } catch (error) {
      console.error(error);
      showMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro inesperado.",
      });
    } finally {
      setLoadingId(null);
      setPendingDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4">
          <h1 className="text-xl font-semibold text-slate-900">Nova categoria</h1>
          <p className="text-sm text-slate-500">
            Separe suas transações em categorias personalizadas para facilitar a
            análise.
          </p>
        </header>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="category-name"
            name="name"
            label="Nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Alimentação"
            disabled={isSubmitting}
            required
          />
          <SelectField
            id="category-type"
            name="type"
            label="Tipo"
            value={type}
            onChange={(event) => setType(event.target.value as TransactionType)}
            options={[
              { label: "Despesa", value: "expense" },
              { label: "Receita", value: "income" },
            ]}
            disabled={isSubmitting}
          />
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Salvando..." : "Adicionar categoria"}
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
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Categorias cadastradas
          </h2>
          <p className="text-sm text-slate-500">
            Edite ou remova categorias que não são mais utilizadas.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
                <th className="px-4 py-3 font-medium text-slate-600">Tipo</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    Nenhuma categoria cadastrada.
                  </td>
                </tr>
              ) : null}
              {categories.map((category) => {
                const isEditing = editingId === category.id;
                const isLoading = loadingId === category.id;
                return (
                  <tr key={category.id} className="align-top">
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <form onSubmit={handleUpdate} className="space-y-2">
                          <TextField
                            id={`name-${category.id}`}
                            name="name"
                            label="Nome"
                            value={draftName}
                            onChange={(event) => setDraftName(event.target.value)}
                            disabled={isLoading}
                            required
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="rounded-md border border-slate-200 px-3 py-1 text-xs"
                              onClick={() => setEditingId(null)}
                              disabled={isLoading}
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white shadow-sm"
                              disabled={isLoading}
                            >
                              {isLoading ? "Salvando..." : "Salvar"}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="font-medium text-slate-700">{category.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <SelectField
                          id={`type-${category.id}`}
                          name="type"
                          label="Tipo"
                          value={draftType}
                          onChange={(event) =>
                            setDraftType(event.target.value as TransactionType)
                          }
                          options={[
                            { label: "Despesa", value: "expense" },
                            { label: "Receita", value: "income" },
                          ]}
                          disabled={isLoading}
                        />
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${category.type === "income" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                        >
                          {category.type === "income" ? "Receita" : "Despesa"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? null : (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-md border border-slate-200 px-3 py-1 text-xs"
                            onClick={() => startEditing(category)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-rose-200 px-3 py-1 text-xs text-rose-600"
                            onClick={() =>
                              setPendingDelete({
                                id: category.id,
                                name: category.name,
                              })
                            }
                            disabled={isLoading}
                          >
                            {isLoading ? "Removendo..." : "Excluir"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Confirmar exclusão"
        description={
          pendingDelete
            ? `Excluir a categoria "${pendingDelete.name}"? Transações já registradas permanecerão sem categoria.`
            : undefined
        }
        confirmLabel="Excluir categoria"
        confirmTone="danger"
        loading={loadingId === pendingDelete?.id}
        onCancel={() => {
          if (loadingId) return;
          setPendingDelete(null);
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </div>
  );
};
