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
  memberId: transaction.user_id,
  memberName: transaction.profiles?.full_name ?? null,
  memberEmail: transaction.profiles?.email ?? null,
  createdBy: transaction.profiles?.full_name ?? null,
});

export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const supabase = await createSupabaseServerClient();
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

  try {
    const body = await request.json();

    const parsed = transactionSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }

    let targetProfileId: string | null | undefined = undefined;
    if (parsed.data.memberId !== undefined) {
      if (parsed.data.memberId) {
        const { data: member } = await supabase
          .from("profiles")
          .select("id, family_id")
          .eq("id", parsed.data.memberId)
          .single<Pick<Profile, "id" | "family_id">>();

        if (!member || member.family_id !== profile.family_id) {
          return NextResponse.json(
            { error: "Responsável não pertence à família" },
            { status: 400 },
          );
        }

        targetProfileId = member.id;
      } else {
        targetProfileId = null;
      }
    }

    const patched = await updateTransaction(
      supabase,
      id,
      profile.family_id,
      {
        profileId: targetProfileId,
        categoryId: parsed.data.categoryId ?? undefined,
        type: parsed.data.type,
        amount: parsed.data.amount,
        occurredOn: parsed.data.occurredOn,
        description: parsed.data.description,
      },
    );

    return NextResponse.json(toPlainTransaction(patched));
  } catch (error) {
    console.error(`PATCH /api/transactions/${id}`, error);
    let message = "Erro ao atualizar transação.";
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
