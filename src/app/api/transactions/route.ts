import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/validation";
import {
  listTransactions,
  createTransaction,
  type TransactionWithRelations,
} from "@/data/transactions";
import type { Profile } from "@/types/database";

const unauthorized = () =>
  NextResponse.json({ error: "Não autenticado" }, { status: 401 });

const toPlainTransaction = (transaction: TransactionWithRelations) => ({
  id: transaction.id,
  amount: Number(transaction.amount),
  type: transaction.type,
  occurredOn: transaction.occurred_on,
  categoryId: transaction.category_id ?? null,
  categoryName: transaction.categories?.name ?? null,
  description: transaction.description ?? null,
  memberId: transaction.user_id,
  memberName: transaction.profiles?.full_name ?? null,
  memberEmail: transaction.profiles?.email ?? null,
  createdBy: transaction.profiles?.full_name ?? null,
});

export const GET = async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorized();
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

  const transactions = await listTransactions(supabase, profile.family_id);
  return NextResponse.json(transactions.map(toPlainTransaction));
};

export const POST = async (request: Request) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorized();
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

  try {
    const body = await request.json();

    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }

    const targetProfileId: string | null = parsed.data.memberId ?? null;

    if (targetProfileId) {
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("id, family_id")
        .eq("id", targetProfileId)
        .single<Pick<Profile, "id" | "family_id">>();

      if (!targetProfile || targetProfile.family_id !== profile.family_id) {
        return NextResponse.json(
          { error: "Responsável não pertence à família" },
          { status: 400 },
        );
      }
    }

    const inserted = await createTransaction(supabase, {
      familyId: profile.family_id,
      profileId: targetProfileId,
      categoryId: parsed.data.categoryId ?? null,
      type: parsed.data.type,
      amount: parsed.data.amount,
      occurredOn: parsed.data.occurredOn,
      description: parsed.data.description ?? null,
    });

    return NextResponse.json(toPlainTransaction(inserted));
  } catch (error) {
    console.error("POST /api/transactions", error);
    let message = "Erro ao registrar transação.";
    if (typeof error === "object" && error !== null) {
      const { code, message: supabaseMessage } = error as {
        code?: string;
        message?: string;
      };
      if (code === "23502") {
        message =
          "Seu banco de dados ainda exige um responsável. Execute as migrações pendentes ou selecione um membro antes de salvar.";
      } else if (supabaseMessage) {
        message = supabaseMessage;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
