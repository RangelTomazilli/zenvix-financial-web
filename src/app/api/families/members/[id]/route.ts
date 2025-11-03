import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { removeMember, listFamilyMembers } from "@/data/families";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const DELETE = async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  const params = await context.params;
  const memberId = params.id;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!memberId) {
    return NextResponse.json({ error: "Membro inválido" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!profile?.family_id) {
    return NextResponse.json(
      { error: "Família ainda não configurada" },
      { status: 400 },
    );
  }

  try {
    try {
      await removeMember(supabase, profile.family_id, memberId);
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: string }).code
          : undefined;
      if (code === "42501" && supabaseAdmin) {
        await removeMember(supabaseAdmin, profile.family_id, memberId);
      } else {
        throw error;
      }
    }
    const members = await listFamilyMembers(supabase, profile.family_id);
    return NextResponse.json({ members });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao remover membro" },
      { status: 400 },
    );
  }
};
