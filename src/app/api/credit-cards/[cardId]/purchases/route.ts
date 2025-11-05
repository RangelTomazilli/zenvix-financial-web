import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/data/families";
import { getCreditCardById, createPurchase } from "@/data/creditCards";
import { creditCardPurchaseSchema } from "@/lib/validation";
import { sendCreditLimitAlert } from "@/lib/credit-cards/notifications";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ cardId: string }>;
}

export const POST = async (request: Request, context: RouteParams) => {
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

  const card = await getCreditCardById(supabase, params.cardId);
  if (!card) {
    return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
  }

  const isFamilyOwner = profile.role === "owner";
  const isCardOwner =
    card.owner && card.owner.user_id && card.owner.user_id === user.id;

  if (!isFamilyOwner && !isCardOwner) {
    return NextResponse.json(
      { error: "Você não tem permissão para registrar compras neste cartão" },
      { status: 403 },
    );
  }

  const parsed = creditCardPurchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.errors[0]?.message ??
          "Dados inválidos para registrar a compra",
      },
      { status: 400 },
    );
  }

  try {
    const result = await createPurchase(supabase, {
      card,
      amount: parsed.data.amount,
      installments: parsed.data.installments,
      purchaseDate: parsed.data.purchaseDate,
      description: parsed.data.description ?? undefined,
      merchant: parsed.data.merchant ?? undefined,
      categoryId: parsed.data.categoryId ?? null,
      profileId: parsed.data.profileId ?? profile.id,
    });

    await sendCreditLimitAlert(supabase, card);

    return NextResponse.json({
      purchase: result.purchase,
      installments: result.installments,
      statements: result.statements,
    });
  } catch (error) {
    logger.error("Erro ao registrar compra no cartão", {
      error,
      cardId: params.cardId,
    });
    return NextResponse.json(
      { error: "Não foi possível registrar a compra" },
      { status: 500 },
    );
  }
};
