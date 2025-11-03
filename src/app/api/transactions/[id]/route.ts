import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/validation";
import type { Profile } from "@/types/database";
import {
  updateTransaction,
  deleteTransaction,
  type TransactionWithRelations,
} from "@/data/transactions";

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

export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const supabase = await createSupabaseServerClient();
  const body = await request.json();
  const { id } = await params;

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
    .single<Profile>();

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
    id,
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

export const DELETE = async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
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
    .single<Profile>();

  if (!profile?.family_id) {
    return NextResponse.json(
      { error: "Família ainda não configurada" },
      { status: 400 },
    );
  }

  const { id } = await params;

  await deleteTransaction(supabase, id, profile.family_id);
  return NextResponse.json({ ok: true });
};
