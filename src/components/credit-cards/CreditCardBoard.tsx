'use client';

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TextField } from "@/components/forms/TextField";
import type {
  Category,
  CreditCardStatement,
  Profile,
} from "@/types/database";
import type { CreditCardSummary } from "@/data/creditCards";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/utils/format";

interface CreditCardBoardProps {
  cards: CreditCardSummary[];
  members: Profile[];
  categories: Category[];
  currency: string;
  currentProfileId: string;
  currentProfileRole: "owner" | "member";
}

type MessageState = { type: "success" | "error"; text: string } | null;

type CardState = CreditCardSummary & {
  statements?: CreditCardStatement[];
  statementsLoading?: boolean;
  statementsLoaded?: boolean;
};

interface PurchaseFormState {
  amount: string;
  installments: number;
  purchaseDate: string;
  description: string;
  merchant: string;
  categoryId: string;
  profileId: string;
}

const toCardState = (card: CreditCardSummary): CardState => ({
  ...card,
  statements: undefined,
  statementsLoaded: false,
  statementsLoading: false,
});

const normalizeApiCard = (payload: {
  owner?: { id: string; full_name: string | null; email: string | null } | null;
  ownerProfile?: { id: string; full_name: string | null; email: string | null } | null;
  usage?: CreditCardSummary["usage"];
  nextStatement?: CreditCardSummary["nextStatement"];
} & CreditCardSummary): CardState => {
  const { owner, ownerProfile, ...rest } = payload;
  const resolvedOwner = ownerProfile ?? owner ?? null;
  return {
    ...rest,
    ownerProfile: resolvedOwner,
    usage: payload.usage ?? {
      pendingAmount: 0,
      billedAmount: 0,
      totalOutstanding: 0,
    },
    nextStatement: payload.nextStatement ?? null,
    statements: undefined,
    statementsLoaded: false,
    statementsLoading: false,
  };
};

const formatDate = (value: string) =>
  format(new Date(value), "dd/MM/yyyy", { locale: ptBR });

const statusLabels: Record<CreditCardStatement["status"], string> = {
  open: "Aberta",
  closed: "Fechada",
  paid: "Paga",
  overdue: "Em atraso",
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export const CreditCardBoard = ({
  cards,
  members,
  categories,
  currency,
  currentProfileId,
  currentProfileRole,
}: CreditCardBoardProps) => {
  const [cardForm, setCardForm] = useState({
    name: "",
    nickname: "",
    brand: "",
    dueDay: 10,
    billingDay: "",
    closingOffsetDays: 7,
    creditLimit: "",
    notifyThreshold: "80",
    notifyDaysBefore: 5,
    ownerProfileId: "",
  });
  const [creatingCard, setCreatingCard] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const [cardsState, setCardsState] = useState<CardState[]>(
    cards.map(toCardState),
  );
  const [openStatements, setOpenStatements] = useState<Record<string, boolean>>(
    {},
  );
  const [openPurchases, setOpenPurchases] = useState<Record<string, boolean>>(
    {},
  );
  const [purchaseForms, setPurchaseForms] = useState<
    Record<string, PurchaseFormState>
  >({});
  const [purchaseLoading, setPurchaseLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [statementActionId, setStatementActionId] = useState<string | null>(null);
  const [notifyStatementId, setNotifyStatementId] = useState<string | null>(null);
  const [refreshingCardId, setRefreshingCardId] = useState<string | null>(null);

  const membersMap = useMemo(
    () =>
      new Map(
        members.map((member) => [
          member.id,
          {
            id: member.id,
            full_name: member.full_name,
            email: member.email,
          },
        ]),
      ),
    [members],
  );

  const mayManageCards = currentProfileRole === "owner";

  const showMessage = (value: MessageState) => {
    setMessage(value);
    if (value) {
      setTimeout(() => {
        setMessage(null);
      }, 3500);
    }
  };

  const resetCardForm = () => {
    setCardForm({
      name: "",
      nickname: "",
      brand: "",
      dueDay: 10,
      billingDay: "",
      closingOffsetDays: 7,
      creditLimit: "",
      notifyThreshold: "80",
      notifyDaysBefore: 5,
      ownerProfileId: "",
    });
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    resetCardForm();
  };

  const getPurchaseForm = (cardId: string) => {
    if (!purchaseForms[cardId]) {
      purchaseForms[cardId] = {
        amount: "",
        installments: 1,
        purchaseDate: todayISO(),
        description: "",
        merchant: "",
        categoryId: "",
        profileId: currentProfileId,
      };
      setPurchaseForms({ ...purchaseForms });
    }
    return purchaseForms[cardId]!;
  };

  const updateCardState = (cardId: string, updater: (card: CardState) => CardState) => {
    setCardsState((prev) =>
      prev.map((card) => (card.id === cardId ? updater(card) : card)),
    );
  };

  const refreshCard = async (cardId: string) => {
    setRefreshingCardId(cardId);
    try {
      const response = await fetch(`/api/credit-cards/${cardId}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao atualizar cartão");
      }
      const refreshed = normalizeApiCard(payload.card);
      updateCardState(cardId, (card) => ({
        ...refreshed,
        statements: card.statements,
        statementsLoaded: card.statementsLoaded,
        statementsLoading: false,
      }));
    } catch (error) {
      console.error(error);
      showMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao atualizar cartão",
      });
    } finally {
      setRefreshingCardId(null);
    }
  };

  const handleCreateCard = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mayManageCards) {
      showMessage({
        type: "error",
        text: "Apenas administradores podem criar cartões.",
      });
      return;
    }

    setCreatingCard(true);
    try {
      const payload = {
        name: cardForm.name.trim(),
        nickname: cardForm.nickname.trim() || undefined,
        brand: cardForm.brand.trim() || undefined,
        dueDay: Number(cardForm.dueDay),
        billingDay:
          cardForm.billingDay === "" ? undefined : Number(cardForm.billingDay),
        closingOffsetDays: Number(cardForm.closingOffsetDays),
        creditLimit: cardForm.creditLimit.trim(),
        notifyThreshold: cardForm.notifyThreshold.trim(),
        notifyDaysBefore: Number(cardForm.notifyDaysBefore),
        ownerProfileId: cardForm.ownerProfileId || null,
      };

      const response = await fetch("/api/credit-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Não foi possível criar o cartão");
      }

      const ownerProfile =
        (body.card.owner_profile_id
          ? membersMap.get(body.card.owner_profile_id)
          : null) ?? null;

      const newCard = toCardState({
        ...body.card,
        ownerProfile,
        usage: {
          pendingAmount: 0,
          billedAmount: 0,
          totalOutstanding: 0,
        },
        nextStatement: null,
      });

      setCardsState((prev) => [newCard, ...prev]);
      handleCloseModal();
      showMessage({ type: "success", text: "Cartão criado com sucesso." });
    } catch (error) {
      console.error(error);
      showMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Erro inesperado ao criar cartão.",
      });
    } finally {
      setCreatingCard(false);
    }
  };

  const toggleStatements = async (cardId: string) => {
    const nextState = !openStatements[cardId];
    setOpenStatements((prev) => ({ ...prev, [cardId]: nextState }));
    if (nextState) {
      const target = cardsState.find((card) => card.id === cardId);
      if (target && !target.statementsLoaded) {
        await loadStatements(cardId);
      }
    }
  };

  const togglePurchaseForm = (cardId: string) => {
    setOpenPurchases((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
    getPurchaseForm(cardId);
  };

  const loadStatements = async (cardId: string) => {
    updateCardState(cardId, (card) => ({
      ...card,
      statementsLoading: true,
    }));
    try {
      const response = await fetch(`/api/credit-cards/${cardId}/statements`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível carregar as faturas");
      }
      updateCardState(cardId, (card) => ({
        ...card,
        statements: payload.statements ?? [],
        statementsLoaded: true,
        statementsLoading: false,
      }));
    } catch (error) {
      console.error(error);
      showMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao carregar faturas.",
      });
      updateCardState(cardId, (card) => ({
        ...card,
        statementsLoading: false,
      }));
    }
  };

  const handlePurchaseChange = (
    cardId: string,
    field: keyof PurchaseFormState,
    value: string,
  ) => {
    setPurchaseForms((prev) => ({
      ...prev,
      [cardId]: {
        ...getPurchaseForm(cardId),
        [field]:
          field === "installments"
            ? Number(value)
            : (value ?? "") as PurchaseFormState[typeof field],
      },
    }));
  };

  const handlePurchaseSubmit = async (
    cardId: string,
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const form = getPurchaseForm(cardId);

    setPurchaseLoading((prev) => ({ ...prev, [cardId]: true }));
    try {
      const response = await fetch(`/api/credit-cards/${cardId}/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: form.amount,
          installments: form.installments,
          purchaseDate: form.purchaseDate,
          description: form.description,
          merchant: form.merchant,
          categoryId: form.categoryId || null,
          profileId: form.profileId || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao registrar compra");
      }

      showMessage({ type: "success", text: "Compra registrada com sucesso." });
      await Promise.all([refreshCard(cardId), loadStatements(cardId)]);
      setPurchaseForms((prev) => ({
        ...prev,
        [cardId]: {
          ...form,
          amount: "",
          description: "",
          merchant: "",
          categoryId: "",
        },
      }));
    } catch (error) {
      console.error(error);
      showMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao registrar compra.",
      });
    } finally {
      setPurchaseLoading((prev) => ({ ...prev, [cardId]: false }));
    }
  };

  const updateStatement = async (
    cardId: string,
    statement: CreditCardStatement,
    action: "close" | "pay" | "reopen",
  ) => {
    setStatementActionId(statement.id);
    try {
      const payload =
        action === "close"
          ? { status: "closed" }
          : action === "pay"
            ? {
                status: "paid",
                paidAmount: statement.total_amount,
                paymentDate: todayISO(),
              }
            : { status: "open" };

      const response = await fetch(
        `/api/credit-cards/statements/${statement.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Não foi possível atualizar a fatura");
      }

      showMessage({ type: "success", text: "Fatura atualizada com sucesso." });
      await Promise.all([refreshCard(cardId), loadStatements(cardId)]);
    } catch (error) {
      console.error(error);
      showMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao atualizar fatura.",
      });
    } finally {
      setStatementActionId(null);
    }
  };

  const sendReminder = async (statementId: string) => {
    setNotifyStatementId(statementId);
    try {
      const response = await fetch(
        `/api/credit-cards/statements/${statementId}/notify`,
        { method: "POST" },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Não foi possível enviar o lembrete");
      }
      showMessage({
        type: "success",
        text: "Lembrete enviado com sucesso.",
      });
    } catch (error) {
      console.error(error);
      showMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao enviar lembrete.",
      });
    } finally {
      setNotifyStatementId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {message ? (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {mayManageCards ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
            onClick={() => setShowCreateModal(true)}
          >
            Adicionar cartão
          </button>
        </div>
      ) : null}

      {mayManageCards ? (
        <Modal
          open={showCreateModal}
          onClose={handleCloseModal}
          title="Adicionar cartão"
          description="Configure vencimento, limite e titular opcional para controlar as faturas."
          size="xl"
        >
          <form onSubmit={handleCreateCard} className="grid gap-4 md:grid-cols-3">
            <TextField
              id="card-name"
              label="Nome do cartão"
              value={cardForm.name}
              onChange={(event) =>
                setCardForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
            <TextField
              id="card-nickname"
              label="Apelido (opcional)"
              value={cardForm.nickname}
              onChange={(event) =>
                setCardForm((prev) => ({
                  ...prev,
                  nickname: event.target.value,
                }))
              }
            />
            <TextField
              id="card-brand"
              label="Bandeira (opcional)"
              value={cardForm.brand}
              onChange={(event) =>
                setCardForm((prev) => ({
                  ...prev,
                  brand: event.target.value,
                }))
              }
            />
            <TextField
              id="card-due-day"
              label="Dia de vencimento"
              type="number"
              min={1}
              max={31}
              value={cardForm.dueDay}
              onChange={(event) =>
                setCardForm((prev) => ({
                  ...prev,
                  dueDay: Number(event.target.value),
                }))
              }
              required
            />
            <TextField
              id="card-closing-offset"
              label="Dias antes do vencimento para fechamento"
              type="number"
              min={1}
              max={20}
              value={cardForm.closingOffsetDays}
              onChange={(event) =>
                setCardForm((prev) => ({
                  ...prev,
                  closingOffsetDays: Number(event.target.value),
                }))
              }
              required
            />
            <TextField
              id="card-billing-day"
              label="Dia fixo de fechamento (opcional)"
              type="number"
              min={1}
              max={31}
              value={cardForm.billingDay}
              onChange={(event) =>
                setCardForm((prev) => ({
                  ...prev,
                  billingDay: event.target.value,
                }))
              }
            />
            <TextField
              id="card-limit"
              label={`Limite (${currency})`}
              inputMode="decimal"
              value={cardForm.creditLimit}
              onChange={(event) =>
                setCardForm((prev) => ({
                  ...prev,
                  creditLimit: event.target.value,
                }))
              }
              placeholder="Ex.: 5000,00"
            />
            <TextField
              id="card-threshold"
              label="Alerta de limite (%)"
              inputMode="decimal"
              value={cardForm.notifyThreshold}
              onChange={(event) =>
                setCardForm((prev) => ({
                  ...prev,
                  notifyThreshold: event.target.value,
                }))
              }
            />
            <TextField
              id="card-reminder-days"
              label="Dias antes do vencimento para lembrete"
              type="number"
              min={1}
              max={15}
              value={cardForm.notifyDaysBefore}
              onChange={(event) =>
                setCardForm((prev) => ({
                  ...prev,
                  notifyDaysBefore: Number(event.target.value),
                }))
              }
              required
            />
            <div className="flex flex-col gap-1.5 md:col-span-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Titular do cartão
              </label>
              <select
                value={cardForm.ownerProfileId}
                onChange={(event) =>
                  setCardForm((prev) => ({
                    ...prev,
                    ownerProfileId: event.target.value,
                  }))
                }
                className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 shadow-lg shadow-slate-200/40 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
              >
                <option value="">Compartilhado (sem titular)</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name ?? member.email ?? "Sem nome"}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
                onClick={handleCloseModal}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
                disabled={creatingCard}
              >
                {creatingCard ? "Salvando..." : "Adicionar cartão"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      <section className="flex flex-col gap-4">
        {cardsState.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Nenhum cartão cadastrado até o momento.
          </div>
        ) : null}

        {cardsState.map((card) => {
          const limitAvailable =
            card.credit_limit !== null
              ? Math.max(card.credit_limit - card.usage.totalOutstanding, 0)
              : null;
          const canRegisterPurchase =
            currentProfileRole === "owner" ||
            card.ownerProfile?.id === currentProfileId;

          const purchaseForm = getPurchaseForm(card.id);

          return (
            <article
              key={card.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {card.name}
                    {card.nickname ? (
                      <span className="ml-2 text-sm font-medium text-slate-500">
                        ({card.nickname})
                      </span>
                    ) : null}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-500">
                    <span>Vencimento dia {card.due_day}</span>
                    <span>Fechamento {card.closing_offset_days} dias antes</span>
                    {card.brand ? <span>Bandeira {card.brand}</span> : null}
                    {card.ownerProfile?.full_name ? (
                      <span>Titular: {card.ownerProfile.full_name}</span>
                    ) : null}
                  </div>
                  {card.nextStatement ? (
                    <p className="mt-2 text-sm text-indigo-600">
                      Próxima fatura:{" "}
                      <strong>{formatDate(card.nextStatement.due_date)}</strong>{" "}
                      ({formatCurrency(card.nextStatement.total_amount, currency)})
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      Nenhuma fatura futura gerada até o momento.
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-start gap-2 text-sm md:items-end">
                  <p className="text-slate-500">
                    Limite utilizado:{" "}
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(card.usage.totalOutstanding, currency)}
                    </span>
                  </p>
                  {card.credit_limit !== null ? (
                    <p className="text-slate-500">
                      Limite total:{" "}
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(card.credit_limit, currency)}
                      </span>
                    </p>
                  ) : (
                    <p className="text-slate-500">
                      Limite total não informado.
                    </p>
                  )}
                  {limitAvailable !== null ? (
                    <p className="text-slate-500">
                      Disponível:{" "}
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(limitAvailable, currency)}
                      </span>
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
                      onClick={() => toggleStatements(card.id)}
                    >
                      {openStatements[card.id] ? "Ocultar faturas" : "Ver faturas"}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60"
                      onClick={() => togglePurchaseForm(card.id)}
                      disabled={!canRegisterPurchase}
                    >
                      {openPurchases[card.id] ? "Ocultar compra" : "Nova compra"}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60"
                      onClick={() => refreshCard(card.id)}
                      disabled={refreshingCardId === card.id}
                    >
                      {refreshingCardId === card.id ? "Atualizando..." : "Atualizar"}
                    </button>
                  </div>
                </div>
              </div>

              {openPurchases[card.id] ? (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                  <h4 className="text-sm font-semibold text-slate-700">
                    Registrar compra parcelada
                  </h4>
                  {!canRegisterPurchase ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Apenas administradores ou o titular do cartão podem registrar compras.
                    </p>
                  ) : null}
                  <form
                    onSubmit={(event) => handlePurchaseSubmit(card.id, event)}
                    className="mt-3 grid gap-3 md:grid-cols-3"
                  >
                    <TextField
                      id={`amount-${card.id}`}
                      label={`Valor (${currency})`}
                      inputMode="decimal"
                      required
                      value={purchaseForm.amount}
                      onChange={(event) =>
                        handlePurchaseChange(card.id, "amount", event.target.value)
                      }
                    />
                    <TextField
                      id={`installments-${card.id}`}
                      label="Parcelas"
                      type="number"
                      min={1}
                      max={48}
                      required
                      value={purchaseForm.installments}
                      onChange={(event) =>
                        handlePurchaseChange(card.id, "installments", event.target.value)
                      }
                    />
                    <TextField
                      id={`date-${card.id}`}
                      label="Data da compra"
                      type="date"
                      required
                      value={purchaseForm.purchaseDate}
                      onChange={(event) =>
                        handlePurchaseChange(card.id, "purchaseDate", event.target.value)
                      }
                    />
                    <TextField
                      id={`merchant-${card.id}`}
                      label="Estabelecimento"
                      value={purchaseForm.merchant}
                      onChange={(event) =>
                        handlePurchaseChange(card.id, "merchant", event.target.value)
                      }
                    />
                    <TextField
                      id={`description-${card.id}`}
                      label="Descrição"
                      value={purchaseForm.description}
                      onChange={(event) =>
                        handlePurchaseChange(card.id, "description", event.target.value)
                      }
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Categoria
                      </label>
                      <select
                        value={purchaseForm.categoryId}
                        onChange={(event) =>
                          handlePurchaseChange(card.id, "categoryId", event.target.value)
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 shadow-lg shadow-slate-200/40 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                      >
                        <option value="">Sem categoria</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Responsável
                      </label>
                      <select
                        value={purchaseForm.profileId}
                        onChange={(event) =>
                          handlePurchaseChange(card.id, "profileId", event.target.value)
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 shadow-lg shadow-slate-200/40 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200/60"
                      >
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.full_name ?? member.email ?? "Sem nome"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-3 flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
                        disabled={purchaseLoading[card.id] || !canRegisterPurchase}
                      >
                        {purchaseLoading[card.id] ? "Registrando..." : "Registrar compra"}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {openStatements[card.id] ? (
                <div className="mt-5 overflow-x-auto">
                  {card.statementsLoading ? (
                    <p className="text-sm text-slate-500">Carregando faturas...</p>
                  ) : card.statements && card.statements.length > 0 ? (
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left">
                        <tr>
                          <th className="px-4 py-3 font-medium text-slate-600">
                            Competência
                          </th>
                          <th className="px-4 py-3 font-medium text-slate-600">
                            Vencimento
                          </th>
                          <th className="px-4 py-3 font-medium text-slate-600">
                            Status
                          </th>
                          <th className="px-4 py-3 font-medium text-slate-600">
                            Total
                          </th>
                          <th className="px-4 py-3 font-medium text-slate-600">
                            Pago
                          </th>
                          <th className="px-4 py-3 font-medium text-slate-600 text-right">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {card.statements.map((statement) => (
                          <tr key={statement.id}>
                            <td className="px-4 py-3 text-slate-600">
                              {formatDate(statement.reference_month)}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {formatDate(statement.due_date)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                  statement.status === "paid"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : statement.status === "overdue"
                                      ? "bg-rose-50 text-rose-600"
                                      : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {statusLabels[statement.status]}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {formatCurrency(statement.total_amount, currency)}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {formatCurrency(statement.paid_amount, currency)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex flex-wrap justify-end gap-2">
                                {statement.status === "open" ? (
                                  <button
                                    type="button"
                                    className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60"
                                    onClick={() =>
                                      updateStatement(card.id, statement, "close")
                                    }
                                    disabled={statementActionId === statement.id}
                                  >
                                    {statementActionId === statement.id
                                      ? "Atualizando..."
                                      : "Fechar fatura"}
                                  </button>
                                ) : null}
                                {statement.status === "closed" ? (
                                  <button
                                    type="button"
                                    className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60"
                                    onClick={() =>
                                      updateStatement(card.id, statement, "pay")
                                    }
                                    disabled={statementActionId === statement.id}
                                  >
                                    {statementActionId === statement.id
                                      ? "Atualizando..."
                                      : "Marcar como paga"}
                                  </button>
                                ) : null}
                                {statement.status === "paid" ? (
                                  <button
                                    type="button"
                                    className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60"
                                    onClick={() =>
                                      updateStatement(card.id, statement, "reopen")
                                    }
                                    disabled={statementActionId === statement.id}
                                  >
                                    {statementActionId === statement.id
                                      ? "Atualizando..."
                                      : "Reabrir"}
                                  </button>
                                ) : null}
                                {statement.status !== "paid" ? (
                                  <button
                                    type="button"
                                    className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60"
                                    onClick={() => sendReminder(statement.id)}
                                    disabled={notifyStatementId === statement.id}
                                  >
                                    {notifyStatementId === statement.id
                                      ? "Enviando..."
                                      : "Enviar lembrete"}
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Nenhuma fatura registrada para este cartão.
                    </p>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
};
