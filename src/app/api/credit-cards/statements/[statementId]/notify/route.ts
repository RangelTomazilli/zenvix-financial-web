import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/data/families";
import { sendStatementReminder } from "@/lib/credit-cards/notifications";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ statementId: string }>;
}

export const POST = async (request: Request, context: RouteParams) => {
  const params = await context.params;
  const supabase = await createSupabaseServerClient();
  const body = request.headers.get("content-type")?.includes("application/json")
    ? await request.json()
    : {};

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

  type StatementRow = {
    id: string;
    card: {
      id: string;
      family_id: string;
      owner_profile_id: string | null;
    };
  };

  const { data: statementRow, error } = await supabase
    .from("credit_card_statements")
    .select(
      `
        id,
        card:credit_cards!inner (
          id,
          family_id,
          owner_profile_id
        )
      `,
    )
    .eq("id", params.statementId)
    .maybeSingle<StatementRow>();

  if (error) {
    logger.error("Erro ao carregar fatura para notificação", {
      error,
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

  const typedStatement = statementRow as StatementRow;

  const isFamilyOwner = profile.role === "owner";
  const isCardOwner =
    typedStatement.card.owner_profile_id &&
    typedStatement.card.owner_profile_id === profile.id;

  if (!isFamilyOwner && !isCardOwner) {
    return NextResponse.json(
      { error: "Você não tem permissão para enviar notificações desta fatura" },
      { status: 403 },
    );
  }

  try {
    await sendStatementReminder(supabase, params.statementId, {
      statementUrl: body?.statementUrl,
    });
    return NextResponse.json({ success: true });
  } catch (sendError) {
    logger.error("Erro ao enviar lembrete de fatura", {
      error: sendError,
      statementId: params.statementId,
    });
    return NextResponse.json(
      { error: "Não foi possível enviar a notificação" },
      { status: 500 },
    );
  }
};
