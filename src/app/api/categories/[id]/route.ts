import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validation";
import { updateCategory, deleteCategory } from "@/data/categories";

interface Params {
  params: {
    id: string;
  };
}

export const PATCH = async (request: Request, { params }: Params) => {
  const supabase = await createSupabaseServerClient();
  const body = await request.json();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.family_id) {
    return NextResponse.json(
      { error: "Família ainda não configurada" },
      { status: 400 },
    );
  }

  const parsed = categorySchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }

  const category = await updateCategory(
    supabase,
    params.id,
    profile.family_id,
    {
      name: parsed.data.name,
      type: parsed.data.type,
    },
  );

  return NextResponse.json(category);
};

export const DELETE = async (_request: Request, { params }: Params) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.family_id) {
    return NextResponse.json(
      { error: "Família ainda não configurada" },
      { status: 400 },
    );
  }

  await deleteCategory(supabase, params.id, profile.family_id);
  return NextResponse.json({ ok: true });
};
