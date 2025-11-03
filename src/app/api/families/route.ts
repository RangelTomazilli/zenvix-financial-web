import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { familySchema } from "@/lib/validation";
import { logger } from "@/lib/logger";
import {
  ensureFamily,
  listFamilyMembers,
  updateFamily,
} from "@/data/families";
import type { Profile } from "@/types/database";

const unauthorized = () =>
  NextResponse.json({ error: "Não autenticado" }, { status: 401 });

const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });

export const GET = async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorized();
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
    logger.error("Perfil não encontrado para usuário", { error });
    return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
  }

  const typedProfile = profile as Profile;
  const family = await ensureFamily(supabase, typedProfile, user.email);
  const members = await listFamilyMembers(supabase, family.id);

  return NextResponse.json({ family, members });
};

export const PATCH = async (request: Request) => {
  const supabase = await createSupabaseServerClient();
  const body = await request.json();

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
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
  }

  const parsed = familySchema.partial().safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.errors[0]?.message ?? "Dados inválidos");
  }

  const { family_id } = profile as Profile;
  if (!family_id) {
    return badRequest("Família ainda não configurada");
  }

  const family = await updateFamily(supabase, family_id, {
    name: parsed.data.name,
    currency_code: parsed.data.currencyCode,
  });

  return NextResponse.json({ family });
};
