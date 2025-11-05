import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { currentAppUrl } from "@/utils/url";
import { sendInviteEmail } from "@/lib/email";

const INVITE_TTL_DAYS = Number(process.env.FAMILY_INVITE_TTL_DAYS ?? 7);

type InviteRecord = {
  id: string;
  family_id: string;
  invitee_email: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string | null;
  created_at: string;
  token: string;
};

export const POST = async (request: Request) => {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const payload = await request.json();
    const email: string | undefined = payload?.email;
    const familyId: string | undefined = payload?.familyId;
    const familyName: string | undefined = payload?.familyName;

    if (!familyId || typeof familyId !== "string") {
      return NextResponse.json(
        { error: "Família inválida" },
        { status: 400 },
      );
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "E-mail inválido" },
        { status: 400 },
      );
    }

    const lowerEmail = email.trim().toLowerCase();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, family_id, full_name, email")
      .eq("user_id", user.id)
      .single<{
        id: string;
        role: "owner" | "member";
        family_id: string | null;
        full_name: string | null;
        email: string | null;
      }>();

    if (profileError || !profile) {
      logger.error("Convite: perfil não encontrado", {
        userId: user.id,
        profileError,
      });
      return NextResponse.json(
        { error: "Perfil do usuário não encontrado" },
        { status: 400 },
      );
    }

    if (profile.family_id !== familyId || profile.role !== "owner") {
      return NextResponse.json(
        {
          error: "Somente administradores da família podem enviar convites",
        },
        { status: 403 },
      );
    }

    const now = new Date();
    const targetFamilyName = familyName ?? "Família";
    const inviterName =
      profile.full_name ?? user.email ?? "Um membro da família";
    const appUrl = currentAppUrl();

    const sendEmail = async (invite: InviteRecord) => {
      const inviteLink = `${appUrl}/invite/${invite.token}`;
      try {
        await sendInviteEmail({
          to: lowerEmail,
          inviterName,
          familyName: targetFamilyName,
          inviteLink,
        });
      } catch (emailError) {
        logger.warn("Convite: falha ao enviar e-mail", {
          emailError,
          inviteId: invite.id,
        });
      }
    };

    const existingInviteResponse = await supabase
      .from("family_invites")
      .select(
        "id, family_id, invitee_email, status, expires_at, created_at, token",
      )
      .eq("family_id", familyId)
      .eq("invitee_email", lowerEmail)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<InviteRecord>();

    if (existingInviteResponse.error) {
      logger.error("Convite: erro ao buscar convite existente", {
        error: existingInviteResponse.error,
        payload: { familyId, email: lowerEmail, inviter: profile.id },
      });
      return NextResponse.json(
        { error: "Erro ao verificar convites existentes" },
        { status: 500 },
      );
    }

    let existingInvite = existingInviteResponse.data;

    if (existingInvite) {
      const isExpired =
        existingInvite.expires_at !== null &&
        new Date(existingInvite.expires_at) <= now;

      if (!isExpired) {
        let refreshedInvite = existingInvite;

        if (INVITE_TTL_DAYS > 0) {
          const refreshedExpiresAt = addDays(now, INVITE_TTL_DAYS).toISOString();
          const refreshResponse = await supabase
            .from("family_invites")
            .update({ expires_at: refreshedExpiresAt } as never)
            .eq("id", existingInvite.id)
            .select(
              "id, family_id, invitee_email, status, expires_at, created_at, token",
            )
            .single<InviteRecord>();

          if (refreshResponse.error) {
            logger.warn("Convite: erro ao atualizar expiração", {
              error: refreshResponse.error,
              inviteId: existingInvite.id,
            });
          } else if (refreshResponse.data) {
            refreshedInvite = refreshResponse.data as InviteRecord;
          }
        }

        await sendEmail(refreshedInvite);

        return NextResponse.json(
          { invite: refreshedInvite, reused: true },
          { status: 200 },
        );
      }

      const expireResponse = await supabase
        .from("family_invites")
        .update({ status: "expired" } as never)
        .eq("id", existingInvite.id);

      if (expireResponse.error) {
        logger.warn("Convite: erro ao expirar convite antigo", {
          error: expireResponse.error,
          inviteId: existingInvite.id,
        });
      }

      existingInvite = null;
    }

    const token = randomUUID();
    const expiresAt = addDays(now, INVITE_TTL_DAYS);

    const inviteInsert = await supabase
      .from("family_invites")
      .insert({
        family_id: familyId,
        inviter_id: profile.id,
        invitee_email: lowerEmail,
        token,
        expires_at: expiresAt.toISOString(),
      } as never)
      .select(
        "id, family_id, invitee_email, status, expires_at, created_at, token",
      )
      .single<InviteRecord>();

    if (inviteInsert.error) {
      logger.error("Convite: erro ao criar", {
        error: inviteInsert.error,
        payload: { familyId, email: lowerEmail, inviter: profile.id },
      });
      return NextResponse.json(
        { error: "Erro ao criar convite" },
        { status: 500 },
      );
    }

    const inviteRecord = inviteInsert.data;

    if (!inviteRecord) {
      return NextResponse.json(
        { error: "Convite não pôde ser criado" },
        { status: 500 },
      );
    }

    await sendEmail({
      id: inviteRecord.id,
      family_id: inviteRecord.family_id,
      invitee_email: inviteRecord.invitee_email,
      status: inviteRecord.status,
      expires_at: inviteRecord.expires_at,
      created_at: inviteRecord.created_at,
      token: inviteRecord.token,
    });

    return NextResponse.json(
      { invite: inviteRecord },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Convite: erro inesperado", error);
    return NextResponse.json(
      { error: "Erro inesperado ao criar convite" },
      { status: 500 },
    );
  }
};
