import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Category,
  Database,
  Transaction,
  TransactionType,
} from "@/types/database";

export type TransactionWithRelations = Transaction & {
  categories: Pick<Category, "id" | "name" | "type"> | null;
  profiles: { id: string; full_name: string | null; email: string | null } | null;
};

export interface TransactionInput {
  familyId: string;
  profileId: string | null;
  categoryId?: string | null;
  type: TransactionType;
  amount: number;
  occurredOn: string;
  description?: string | null;
}

export interface TransactionUpdate {
  profileId?: string | null;
  categoryId?: string | null;
  type?: TransactionType;
  amount?: number;
  occurredOn?: string;
  description?: string | null;
}

type Client = SupabaseClient<Database>;

export const listTransactions = async (
  client: Client,
  familyId: string,
): Promise<TransactionWithRelations[]> => {
  const { data, error } = await client
    .from("transactions")
    .select(
      `
        *,
        categories (
          id,
          name,
          type
        ),
        profiles (
          id,
          full_name,
          email
        )
      `,
    )
    .eq("family_id", familyId)
    .order("occurred_on", { ascending: false });

  if (error) {
    throw error;
  }

  return data as TransactionWithRelations[];
};

export const createTransaction = async (
  client: Client,
  payload: TransactionInput,
): Promise<TransactionWithRelations> => {
  const insertPayload = {
    family_id: payload.familyId,
    user_id: payload.profileId,
    category_id: payload.categoryId ?? null,
    type: payload.type,
    amount: payload.amount,
    occurred_on: payload.occurredOn,
    description: payload.description ?? null,
  } satisfies Database["public"]["Tables"]["transactions"]["Insert"];

  const { data, error } = await client
    .from("transactions")
    .insert(insertPayload as never)
    .select(
      `*,
      categories ( id, name, type ),
      profiles ( id, full_name, email )
    `,
    )
    .single<TransactionWithRelations>();

  if (error) {
    throw error;
  }

  return data as TransactionWithRelations;
};

export const updateTransaction = async (
  client: Client,
  transactionId: string,
  familyId: string,
  patch: TransactionUpdate,
): Promise<TransactionWithRelations> => {
  const updatePayload: Database["public"]["Tables"]["transactions"]["Update"] =
    {
      category_id: patch.categoryId ?? undefined,
      type: patch.type,
      amount: patch.amount,
      occurred_on: patch.occurredOn,
      description: patch.description ?? undefined,
    };

  if (patch.profileId !== undefined) {
    updatePayload.user_id = patch.profileId;
  }

  const { data, error } = await client
    .from("transactions")
    .update(updatePayload as never)
    .eq("id", transactionId)
    .eq("family_id", familyId)
    .select(
      `*,
      categories ( id, name, type ),
      profiles ( id, full_name, email )
    `,
    )
    .single<TransactionWithRelations>();

  if (error) {
    throw error;
  }

  return data as TransactionWithRelations;
};

export const deleteTransaction = async (
  client: Client,
  transactionId: string,
  familyId: string,
) => {
  const { error } = await client
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("family_id", familyId);

  if (error) {
    throw error;
  }
};

export interface MonthlyTotals {
  month: string;
  income: number;
  expense: number;
}

export const fetchMonthlyTotals = async (
  client: Client,
  familyId: string,
  months = 6,
) => {
  const { data, error } = await client.rpc(
    "transactions_monthly_totals",
    { p_family_id: familyId, p_months_back: months } as never,
  );

  if (error) {
    if (error.code === "42883") {
      return [];
    }
    throw error;
  }

  return data as MonthlyTotals[];
};
