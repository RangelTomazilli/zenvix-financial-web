import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addMemberByEmail, listFamilyMembers } from "@/data/families";
import type { Profile } from "@/types/database";

export const POST = async (request: Request) => {
  const supabase = await createSupabaseServerClient();
  const { email } = await request.json();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Informe o e-mail do membro" }, { status: 400 });
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
    const member = await addMemberByEmail(supabase, profile.family_id, email);
    const members = await listFamilyMembers(supabase, profile.family_id);
    return NextResponse.json({ member, members });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao adicionar membro" },
      { status: 400 },
    );
  }
};
