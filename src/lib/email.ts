import { join } from "node:path";
import { readFile } from "node:fs/promises";
import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

const smtpHost = process.env.SMTP_HOST ?? "smtp.gmail.com";
const smtpPort = Number.parseInt(process.env.SMTP_PORT ?? "465", 10);
const smtpSecure =
  process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === "true"
    : smtpPort === 465;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom =
  process.env.SMTP_FROM ?? smtpUser ?? "contato@zenvix.com.br";

const mailer =
  smtpHost && smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    : null;

interface InviteEmailPayload {
  to: string;
  inviterName: string;
  familyName: string;
  inviteLink: string;
}

export const sendInviteEmail = async (payload: InviteEmailPayload) => {
  if (!mailer) {
    logger.info("E-mail de convite não enviado (SMTP inoperante)", {
      reason: "Credenciais ausentes",
      payload,
    });
    return;
  }

  try {
    const html = await renderInviteTemplate(payload);
    const text = renderInviteText(payload);

    await mailer.sendMail({
      from: smtpFrom,
      to: payload.to,
      subject: `Convite para ${payload.familyName}`,
      html,
      text,
    });
  } catch (error) {
    logger.error("Falha ao enviar e-mail de convite", { error, payload });
    throw error;
  }
};

let inviteTemplateCache: string | null = null;

const loadInviteTemplate = async () => {
  if (inviteTemplateCache) {
    return inviteTemplateCache;
  }
  const templatePath = join(
    process.cwd(),
    "src",
    "email",
    "templates",
    "family-invite.html",
  );
  inviteTemplateCache = await readFile(templatePath, "utf-8");
  return inviteTemplateCache;
};

const renderInviteTemplate = async (payload: InviteEmailPayload) => {
  const template = await loadInviteTemplate();

  return template
    .replace(/{{\s*INVITER_NAME\s*}}/g, payload.inviterName)
    .replace(/{{\s*FAMILY_NAME\s*}}/g, payload.familyName)
    .replace(/{{\s*INVITE_LINK\s*}}/g, payload.inviteLink);
};

const renderInviteText = (payload: InviteEmailPayload) => {
  return [
    `Olá!`,
    "",
    `${payload.inviterName} convidou você para acessar a família ${payload.familyName} na Zenvix.`,
    "Acesse o link abaixo para aceitar o convite:",
    payload.inviteLink,
    "",
    "Se você não solicitou este convite, pode ignorar esta mensagem.",
  ].join("\n");
};
