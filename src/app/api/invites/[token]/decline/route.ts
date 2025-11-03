'use server';

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const POST = async (
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ token: string }>;
  },
) => {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Convite inválido" }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data: invite, error: inviteError } = await supabase
      .from("family_invites")
      .select("*")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: "Convite não encontrado ou expirado" },
        { status: 404 },
      );
    }

    const userEmail = user.email?.toLowerCase() ?? "";
    if (invite.invitee_email !== userEmail) {
      return NextResponse.json(
        { error: "Convite destinado a outro e-mail" },
        { status: 403 },
      );
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
    }

    const updateInvite = await supabase
      .from("family_invites")
      .update({
        status: "revoked",
      })
      .eq("id", invite.id);

    if (updateInvite.error) {
      logger.warn("Convite: falha ao recusar", {
        inviteId: invite.id,
        error: updateInvite.error,
      });
      return NextResponse.json(
        { error: "Erro ao recusar convite" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    logger.error("Convite: erro ao recusar", error);
    return NextResponse.json(
      { error: "Erro inesperado ao recusar convite" },
      { status: 500 },
    );
  }
};
