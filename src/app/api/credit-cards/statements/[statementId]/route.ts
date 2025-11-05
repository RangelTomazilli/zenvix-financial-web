import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/data/families";
import { updateStatementStatus } from "@/data/creditCards";
import { statementUpdateSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ statementId: string }>;
}

export const PATCH = async (request: Request, context: RouteParams) => {
  const params = await context.params;
  const supabase = await createSupabaseServerClient();
  const body = await request.json();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let profile;
  try {
    profile = await getCurrentProfile(supabase, user.id);
  } catch (error) {
    logger.error("Erro ao obter perfil atual", { error });
    return NextResponse.json(
      { error: "Não foi possível carregar o perfil" },
      { status: 500 },
    );
  }

  if (profile.role !== "owner") {
    return NextResponse.json(
      { error: "Apenas administradores podem atualizar faturas" },
      { status: 403 },
    );
  }

  const parsed = statementUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.errors[0]?.message ??
          "Dados inválidos para atualizar a fatura",
      },
      { status: 400 },
    );
  }

  const { data: statementRow, error: statementError } = await supabase
    .from("credit_card_statements")
    .select(
      `
        *,
        card:credit_cards!inner(id, family_id)
      `,
    )
    .eq("id", params.statementId)
    .maybeSingle();

  if (statementError) {
    logger.error("Erro ao carregar fatura", {
      error: statementError,
      statementId: params.statementId,
    });
    return NextResponse.json(
      { error: "Não foi possível carregar a fatura" },
      { status: 500 },
    );
  }

  if (!statementRow) {
    return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 });
  }

  try {
    const updated = await updateStatementStatus(
      supabase,
      params.statementId,
      parsed.data.status,
      {
        paidAmount: parsed.data.paidAmount ?? undefined,
        paymentDate: parsed.data.paymentDate ?? undefined,
      },
    );

    return NextResponse.json({ statement: updated });
  } catch (error) {
    logger.error("Erro ao atualizar status da fatura", {
      error,
      statementId: params.statementId,
    });
    return NextResponse.json(
      { error: "Não foi possível atualizar a fatura" },
      { status: 500 },
    );
  }
};
