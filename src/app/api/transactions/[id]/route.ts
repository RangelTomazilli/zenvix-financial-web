import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/validation";
import {
  updateTransaction,
  deleteTransaction,
  type TransactionWithRelations,
} from "@/data/transactions";

interface Params {
  params: {
    id: string;
  };
}

const toPlainTransaction = (transaction: TransactionWithRelations) => ({
  id: transaction.id,
  amount: Number(transaction.amount),
  type: transaction.type,
  occurredOn: transaction.occurred_on,
  categoryId: transaction.category_id ?? null,
  categoryName: transaction.categories?.name ?? null,
  description: transaction.description ?? null,
  createdBy: transaction.profiles?.full_name ?? null,
});

export const PATCH = async (request: Request, { params }: Params) => {
  const supabase = await createSupabaseServerClient();
  const body = await request.json();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile?.family_id) {
    return NextResponse.json(
      { error: "Família ainda não configurada" },
      { status: 400 },
    );
  }

  const parsed = transactionSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const patched = await updateTransaction(
    supabase,
    params.id,
    profile.family_id,
    {
      categoryId: parsed.data.categoryId ?? undefined,
      type: parsed.data.type,
      amount: parsed.data.amount,
      occurredOn: parsed.data.occurredOn,
      description: parsed.data.description,
    },
  );

  return NextResponse.json(toPlainTransaction(patched));
};

export const DELETE = async (_request: Request, { params }: Params) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile?.family_id) {
    return NextResponse.json(
      { error: "Família ainda não configurada" },
      { status: 400 },
    );
  }

  await deleteTransaction(supabase, params.id, profile.family_id);
  return NextResponse.json({ ok: true });
};
