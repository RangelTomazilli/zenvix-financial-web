import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/data/families";
import {
  listCreditCards,
  createCreditCard,
} from "@/data/creditCards";
import { creditCardSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export const GET = async () => {
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

  if (!profile.family_id) {
    return NextResponse.json(
      { cards: [] },
      { status: 200 },
    );
  }

  try {
    const cards = await listCreditCards(supabase, profile.family_id);
    const response = cards.map((card) => ({
      ...card,
      usage: card.usage,
      nextStatement: card.nextStatement,
      limitAvailable:
        card.credit_limit !== null
          ? Math.round(
              Math.max(
                card.credit_limit - card.usage.totalOutstanding,
                0,
              ) * 100,
            ) / 100
          : null,
    }));

    return NextResponse.json({ cards: response });
  } catch (error) {
    logger.error("Erro ao listar cartões de crédito", { error, userId: user.id });
    return NextResponse.json(
      { error: "Não foi possível carregar os cartões" },
      { status: 500 },
    );
  }
};

export const POST = async (request: Request) => {
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
      { error: "Apenas administradores podem criar cartões" },
      { status: 403 },
    );
  }

  if (!profile.family_id) {
    return NextResponse.json(
      { error: "Família não encontrada" },
      { status: 400 },
    );
  }

  const parsed = creditCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.errors[0]?.message ?? "Dados inválidos para criação do cartão",
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  try {
    const card = await createCreditCard(supabase, {
      family_id: profile.family_id,
      owner_profile_id: payload.ownerProfileId ?? null,
      name: payload.name,
      nickname: payload.nickname ?? null,
      brand: payload.brand ?? null,
      credit_limit: payload.creditLimit,
      billing_day: payload.billingDay ?? null,
      due_day: payload.dueDay,
      closing_offset_days: payload.closingOffsetDays ?? 7,
      notify_threshold:
        payload.notifyThreshold === null || payload.notifyThreshold === undefined
          ? 80
          : payload.notifyThreshold,
      notify_days_before: payload.notifyDaysBefore ?? 5,
    });

    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    logger.error("Erro ao criar cartão de crédito", {
      error,
      userId: user.id,
    });
    return NextResponse.json(
      { error: "Não foi possível criar o cartão" },
      { status: 500 },
    );
  }
};
