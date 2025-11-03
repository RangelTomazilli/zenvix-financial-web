import { Resend } from "resend";
import { logger } from "@/lib/logger";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL ?? "convites@zenvix.com.br";

const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

interface InviteEmailPayload {
  to: string;
  inviterName: string;
  familyName: string;
  inviteLink: string;
}

export const sendInviteEmail = async (payload: InviteEmailPayload) => {
  if (!resendClient) {
    logger.info("E-mail de convite não enviado (RESEND_API_KEY ausente)", {
      payload,
    });
    return;
  }

  try {
    await resendClient.emails.send({
      from: resendFrom,
      to: payload.to,
      subject: `Convite para ${payload.familyName}`,
      html: `
        <p>Olá!</p>
        <p>${payload.inviterName} convidou você para participar da família <strong>${payload.familyName}</strong> no Zenvix Controle Financeiro.</p>
        <p>Para aceitar o convite, clique no link abaixo:</p>
        <p><a href="${payload.inviteLink}" target="_blank" rel="noopener noreferrer">${payload.inviteLink}</a></p>
        <p>Se você não esperava este convite, pode ignorar este e-mail.</p>
      `,
    });
  } catch (error) {
    logger.error("Falha ao enviar e-mail de convite", { error, payload });
    throw error;
  }
};
