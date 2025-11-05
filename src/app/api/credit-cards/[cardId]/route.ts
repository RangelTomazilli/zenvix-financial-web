import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/data/families";
import {
  getCreditCardById,
  updateCreditCard,
  deleteCreditCard,
} from "@/data/creditCards";
import { creditCardUpdateSchema } from "@/lib/validation";
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

  const card = await getCreditCardById(supabase, params.cardId);

  if (!card) {
    return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ card });
};

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
      { error: "Apenas administradores podem atualizar cartões" },
      { status: 403 },
    );
  }

  const parsed = creditCardUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.errors[0]?.message ??
          "Dados inválidos para atualização do cartão",
      },
      { status: 400 },
    );
  }

  const card = await getCreditCardById(supabase, params.cardId);
  if (!card) {
    return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
  }

  try {
    const updated = await updateCreditCard(supabase, params.cardId, {
      name: parsed.data.name ?? undefined,
      nickname: parsed.data.nickname ?? undefined,
      brand: parsed.data.brand ?? undefined,
      due_day: parsed.data.dueDay ?? undefined,
      billing_day:
        parsed.data.billingDay === undefined
          ? undefined
          : parsed.data.billingDay ?? null,
      closing_offset_days: parsed.data.closingOffsetDays ?? undefined,
      credit_limit:
        parsed.data.creditLimit === undefined
          ? undefined
          : parsed.data.creditLimit,
      notify_threshold:
        parsed.data.notifyThreshold === undefined
          ? undefined
          : parsed.data.notifyThreshold,
      notify_days_before: parsed.data.notifyDaysBefore ?? undefined,
      owner_profile_id:
        parsed.data.ownerProfileId === undefined
          ? undefined
          : parsed.data.ownerProfileId ?? null,
    });

    return NextResponse.json({ card: updated });
  } catch (error) {
    logger.error("Erro ao atualizar cartão de crédito", {
      error,
      cardId: params.cardId,
    });
    return NextResponse.json(
      { error: "Não foi possível atualizar o cartão" },
      { status: 500 },
    );
  }
};

export const DELETE = async (_request: Request, context: RouteParams) => {
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

  if (profile.role !== "owner") {
    return NextResponse.json(
      { error: "Apenas administradores podem remover cartões" },
      { status: 403 },
    );
  }

  const card = await getCreditCardById(supabase, params.cardId);
  if (!card) {
    return NextResponse.json({ error: "Cartão não encontrado" }, { status: 404 });
  }

  try {
    await deleteCreditCard(supabase, params.cardId);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Erro ao remover cartão de crédito", {
      error,
      cardId: params.cardId,
    });
    return NextResponse.json(
      { error: "Não foi possível remover o cartão" },
      { status: 500 },
    );
  }
};
