import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreditCard,
  CreditCardInstallment,
  CreditCardPurchase,
  CreditCardStatement,
  Database,
  Profile,
} from "@/types/database";
import { formatISODate, generateInstallmentSchedule, calculateStatementPeriod } from "@/lib/credit-cards/schedule";

type Client = SupabaseClient<Database>;

export interface CreditCardSummary extends CreditCard {
  ownerProfile: Pick<Profile, "id" | "full_name" | "email"> | null;
  usage: {
    pendingAmount: number;
    billedAmount: number;
    totalOutstanding: number;
  };
  nextStatement: CreditCardStatement | null;
}

export const listCreditCards = async (
  client: Client,
  familyId: string,
): Promise<CreditCardSummary[]> => {
  const { data, error } = await client
    .from("credit_cards")
    .select("*")
    .eq("family_id", familyId)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  const cards = (data ?? []) as CreditCard[];

  const ownerIds = Array.from(
    new Set(
      cards
        .map((card) => card.owner_profile_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  let ownersMap = new Map<string, Pick<Profile, "id" | "full_name" | "email">>();
  if (ownerIds.length > 0) {
    const { data: owners, error: ownersError } = await client
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ownerIds);

    if (ownersError) {
      throw ownersError;
    }

    const ownersList = (owners ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string | null;
    }>;

    ownersMap = new Map(
      ownersList.map((owner) => [
        owner.id,
        owner as Pick<Profile, "id" | "full_name" | "email">,
      ]),
    );
  }

  const summaries: CreditCardSummary[] = [];
  for (const card of cards) {
    const usageRow = await getCardUsage(client, card.id);
    const nextStatement = await fetchNextStatement(client, card.id);

    summaries.push({
      ...card,
      ownerProfile: card.owner_profile_id
        ? ownersMap.get(card.owner_profile_id) ?? null
        : null,
      usage: usageRow,
      nextStatement,
    });
  }

  return summaries;
};

export const getCreditCardById = async (client: Client, cardId: string) => {
  const { data, error } = await client
    .from("credit_cards")
    .select(
      `
        *,
        owner:profiles!credit_cards_owner_profile_id_fkey ( id, full_name, email )
      `,
    )
    .eq("id", cardId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const { owner, ...cardData } = data as CreditCard & { owner: Profile | null };
  const usage = await getCardUsage(client, cardData.id);
  const nextStatement = await fetchNextStatement(client, cardData.id);

  return {
    ...(cardData as CreditCard),
    owner: owner ?? null,
    usage,
    nextStatement,
  };
};

export const createCreditCard = async (
  client: Client,
  payload: Database["public"]["Tables"]["credit_cards"]["Insert"],
) => {
  const { data, error } = await client
    .from("credit_cards")
    .insert(payload as never)
    .select("*")
    .single<CreditCard>();

  if (error) {
    throw error;
  }

  return data as CreditCard;
};

export const updateCreditCard = async (
  client: Client,
  cardId: string,
  patch: Database["public"]["Tables"]["credit_cards"]["Update"],
) => {
  const { data, error } = await client
    .from("credit_cards")
    .update(patch as never)
    .eq("id", cardId)
    .select("*")
    .single<CreditCard>();

  if (error) {
    throw error;
  }

  return data as CreditCard;
};

export const deleteCreditCard = async (client: Client, cardId: string) => {
  const { error } = await client.from("credit_cards").delete().eq("id", cardId);

  if (error) {
    throw error;
  }
};

export interface PurchaseInput {
  card: CreditCard;
  amount: number;
  installments: number;
  purchaseDate: string;
  description?: string;
  merchant?: string;
  categoryId?: string | null;
  profileId?: string | null;
}

export interface CreatedPurchaseResult {
  purchase: CreditCardPurchase;
  installments: CreditCardInstallment[];
  statements: CreditCardStatement[];
}

export const createPurchase = async (
  client: Client,
  payload: PurchaseInput,
): Promise<CreatedPurchaseResult> => {
  const purchaseDate = new Date(payload.purchaseDate);
  const dueDay = payload.card.due_day;
  const closingOffset = payload.card.closing_offset_days;

  const schedule = generateInstallmentSchedule({
    purchaseDate,
    totalAmount: payload.amount,
    installments: payload.installments,
    dueDay,
    closingOffsetDays: closingOffset,
  });

  const statementsByMonth = new Map<string, CreditCardStatement>();

  for (const installment of schedule.installments) {
    const monthKey = formatISODate(installment.competenceMonth);
    if (!statementsByMonth.has(monthKey)) {
      const { periodStart, periodEnd } = calculateStatementPeriod(
        installment.dueDate,
        dueDay,
        closingOffset,
      );
      const statement = await upsertStatement(client, payload.card.id, {
        referenceMonth: monthKey,
        dueDate: formatISODate(installment.dueDate),
        periodStart: formatISODate(periodStart),
        periodEnd: formatISODate(periodEnd),
      });
      statementsByMonth.set(monthKey, statement);
    }
  }

  const firstStatement = statementsByMonth.get(
    formatISODate(schedule.firstInstallmentMonth),
  );

  const { data: purchaseRow, error: purchaseError } = await client
    .from("credit_card_purchases")
    .insert({
      card_id: payload.card.id,
      statement_id: firstStatement?.id ?? null,
      profile_id: payload.profileId ?? null,
      category_id: payload.categoryId ?? null,
      description: payload.description ?? null,
      merchant: payload.merchant ?? null,
      amount: payload.amount,
      installments: payload.installments,
      purchase_date: formatISODate(purchaseDate),
      first_installment_month: formatISODate(schedule.firstInstallmentMonth),
    } as never)
    .select("*")
    .single<CreditCardPurchase>();

  if (purchaseError) {
    throw purchaseError;
  }

  const installmentsPayload = schedule.installments.map((installment) => {
    const monthKey = formatISODate(installment.competenceMonth);
    const statement = statementsByMonth.get(monthKey);
    return {
      purchase_id: purchaseRow.id,
      statement_id: statement?.id ?? null,
      installment_number: installment.installmentNumber,
      amount: installment.amount,
      competence_month: monthKey,
      due_date: formatISODate(installment.dueDate),
      status: "pending",
    } satisfies Database["public"]["Tables"]["credit_card_installments"]["Insert"];
  });

  const { data: insertedInstallments, error: installmentsError } = await client
    .from("credit_card_installments")
    .insert(installmentsPayload as never)
    .select("*");

  if (installmentsError) {
    throw installmentsError;
  }

  const statements = Array.from(statementsByMonth.values());
  await Promise.all(
    statements.map((statement) =>
      recalculateStatementTotals(client, statement.id),
    ),
  );

  return {
    purchase: purchaseRow,
    installments: (insertedInstallments ?? []) as CreditCardInstallment[],
    statements,
  };
};

export const getCardUsage = async (client: Client, cardId: string) => {
  const { data, error } = await client.rpc(
    "credit_card_usage",
    { p_card_id: cardId } as never,
  );

  if (error) {
    throw error;
  }

  const rows =
    (Array.isArray(data) ? (data as Array<Record<string, number>>) : []) ?? [];
  const row = rows.length > 0 ? rows[0] : null;
  return {
    pendingAmount: Number(row?.pending_amount ?? 0),
    billedAmount: Number(row?.billed_amount ?? 0),
    totalOutstanding: Number(row?.total_outstanding ?? 0),
  };
};

const fetchNextStatement = async (client: Client, cardId: string) => {
  const { data, error } = await client
    .from("credit_card_statements")
    .select("*")
    .eq("card_id", cardId)
    .in("status", ["open", "closed"])
    .order("due_date", { ascending: true })
    .limit(1)
    .maybeSingle<CreditCardStatement>();

  if (error) {
    throw error;
  }

  return data ?? null;
};

const upsertStatement = async (
  client: Client,
  cardId: string,
  payload: {
    referenceMonth: string;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
  },
) => {
  const { data, error } = await client
    .from("credit_card_statements")
    .upsert(
      {
        card_id: cardId,
        reference_month: payload.referenceMonth,
        due_date: payload.dueDate,
        period_start: payload.periodStart,
        period_end: payload.periodEnd,
      } as never,
      { onConflict: "card_id,reference_month" },
    )
    .select("*")
    .single<CreditCardStatement>();

  if (error) {
    throw error;
  }

  return data as CreditCardStatement;
};

export const recalculateStatementTotals = async (
  client: Client,
  statementId: string,
) => {
  const { data, error } = await client
    .from("credit_card_installments")
    .select("amount,status")
    .eq("statement_id", statementId);

  if (error) {
    throw error;
  }

  const installments = (data ?? []) as Array<{
    amount: number;
    status: CreditCardInstallment["status"];
  }>;

  const totals = installments.reduce(
    (acc, installment) => {
      const amount = Number(installment.amount ?? 0);
      if (!Number.isFinite(amount)) return acc;
      if (installment.status === "paid") {
        acc.paid += amount;
      }
      if (installment.status !== "cancelled") {
        acc.total += amount;
      }
      return acc;
    },
    { total: 0, paid: 0 },
  );

  const { error: updateError } = await client
    .from("credit_card_statements")
    .update({
      total_amount: Math.round(totals.total * 100) / 100,
      paid_amount: Math.round(totals.paid * 100) / 100,
    } as never)
    .eq("id", statementId);

  if (updateError) {
    throw updateError;
  }
};

export const listStatementsForCard = async (
  client: Client,
  cardId: string,
) => {
  const { data, error } = await client
    .from("credit_card_statements")
    .select("*")
    .eq("card_id", cardId)
    .order("due_date", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CreditCardStatement[];
};

export const updateStatementStatus = async (
  client: Client,
  statementId: string,
  status: CreditCardStatement["status"],
  options?: {
    paidAmount?: number | null;
    paymentDate?: string | null;
  },
) => {
  const patch: Database["public"]["Tables"]["credit_card_statements"]["Update"] =
    {
      status,
    };

  if (status === "paid") {
    patch.paid_amount =
      options?.paidAmount !== undefined && options?.paidAmount !== null
        ? options.paidAmount
        : undefined;
  }

  const { data, error } = await client
    .from("credit_card_statements")
    .update(patch as never)
    .eq("id", statementId)
    .select("*")
    .single<CreditCardStatement>();

  if (error) {
    throw error;
  }

  if (status === "closed") {
    await updateInstallmentsStatus(client, statementId, "billed");
  } else if (status === "paid") {
    await updateInstallmentsStatus(client, statementId, "paid", {
      paidAt:
        options?.paymentDate ??
        formatISODate(new Date()),
    });
  } else if (status === "open") {
    await updateInstallmentsStatus(client, statementId, "pending", {
      resetPaidAt: true,
    });
  }

  await recalculateStatementTotals(client, statementId);

  return data as CreditCardStatement;
};

const updateInstallmentsStatus = async (
  client: Client,
  statementId: string,
  status: "pending" | "billed" | "paid",
  options?: { paidAt?: string; resetPaidAt?: boolean },
) => {
  const patch: Database["public"]["Tables"]["credit_card_installments"]["Update"] =
    {
      status,
    };

  if (status === "paid") {
    patch.paid_at =
      options?.paidAt !== undefined ? options.paidAt : formatISODate(new Date());
  } else if (options?.resetPaidAt) {
    patch.paid_at = null;
  }

  const { error } = await client
    .from("credit_card_installments")
    .update(patch as never)
    .eq("statement_id", statementId);

  if (error) {
    throw error;
  }
};
