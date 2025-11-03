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

    if (invite.status !== "pending") {
      return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Convite expirado" },
        { status: 400 },
      );
    }

    const userEmail = user.email?.toLowerCase() ?? "";
    if (invite.invitee_email !== userEmail) {
      return NextResponse.json(
        { error: "Convite destinado a outro e-mail" },
        { status: 403 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      logger.error("Convite: perfil do convidado não encontrado", {
        userId: user.id,
        profileError,
      });
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 400 },
      );
    }

    const updateProfile = await supabase
      .from("profiles")
      .update({
        family_id: invite.family_id,
        role: profile.role === "owner" ? "owner" : "member",
      })
      .eq("id", profile.id);

    if (updateProfile.error) {
      logger.error("Convite: falha ao atualizar perfil", {
        profileId: profile.id,
        error: updateProfile.error,
      });
      return NextResponse.json(
        { error: "Erro ao vincular usuário à família" },
        { status: 500 },
      );
    }

    const updateInvite = await supabase
      .from("family_invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    if (updateInvite.error) {
      logger.warn("Convite: falha ao atualizar status", {
        inviteId: invite.id,
        error: updateInvite.error,
      });
    }

    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    logger.error("Convite: erro ao aceitar", error);
    return NextResponse.json(
      { error: "Erro inesperado ao aceitar convite" },
      { status: 500 },
    );
  }
};
