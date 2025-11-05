import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/data/families";
import { getCreditCardById, listStatementsForCard } from "@/data/creditCards";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ cardId: string }>;
}

export const GET = async (_request: Request, context: RouteParams) => {
  const params = await context.params;
  const supabase = await createSupabaseServerClient();
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

  const card = await getCreditCardById(supabase, params.cardId);
  if (!card) {
    return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
  }

  const isFamilyOwner = profile.role === "owner";
  const isCardOwner =
    card.owner && card.owner.user_id && card.owner.user_id === user.id;

  if (!isFamilyOwner && !isCardOwner) {
    return NextResponse.json(
      { error: "Você não tem permissão para visualizar as faturas" },
      { status: 403 },
    );
  }

  try {
    const statements = await listStatementsForCard(supabase, params.cardId);
    return NextResponse.json({ statements });
  } catch (error) {
    logger.error("Erro ao listar faturas do cartão", {
      error,
      cardId: params.cardId,
    });
    return NextResponse.json(
      { error: "Não foi possível carregar as faturas" },
      { status: 500 },
    );
  }
};
