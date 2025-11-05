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

const templateCache = new Map<string, string>();

const loadTemplate = async (fileName: string) => {
  const cached = templateCache.get(fileName);
  if (cached) {
    return cached;
  }
  const templatePath = join(process.cwd(), "src", "email", "templates", fileName);
  const content = await readFile(templatePath, "utf-8");
  templateCache.set(fileName, content);
  return content;
};

const renderInviteTemplate = async (payload: InviteEmailPayload) => {
  const template = await loadTemplate("family-invite.html");

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

const formatCurrency = (value: number, currency = "BRL") =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);

const toAddress = (recipient: string | string[]) =>
  Array.isArray(recipient) ? recipient.join(", ") : recipient;

interface StatementReminderPayload {
  to: string | string[];
  cardName: string;
  dueDate: string;
  totalAmount: number;
  statementUrl?: string;
}

export const sendStatementReminderEmail = async (
  payload: StatementReminderPayload,
) => {
  if (!mailer) {
    logger.info("Lembrete de fatura não enviado (SMTP inoperante)", {
      payload,
    });
    return;
  }

  const html = await renderStatementReminderTemplate(payload);
  const text = renderStatementReminderText(payload);

  await mailer.sendMail({
    from: smtpFrom,
    to: toAddress(payload.to),
    subject: `Lembrete: fatura do cartão ${payload.cardName} vence em ${payload.dueDate}`,
    html,
    text,
  });
};

const renderStatementReminderTemplate = async (
  payload: StatementReminderPayload,
) => {
  const template = await loadTemplate("statement-reminder.html");
  return template
    .replace(/{{\s*CARD_NAME\s*}}/g, payload.cardName)
    .replace(/{{\s*DUE_DATE\s*}}/g, payload.dueDate)
    .replace(/{{\s*TOTAL_AMOUNT\s*}}/g, formatCurrency(payload.totalAmount))
    .replace(/{{\s*STATEMENT_LINK\s*}}/g, payload.statementUrl ?? "#");
};

const renderStatementReminderText = (payload: StatementReminderPayload) => {
  const lines = [
    `Olá!`,
    "",
    `A fatura do cartão ${payload.cardName} vence em ${payload.dueDate}.`,
    `Valor total: ${formatCurrency(payload.totalAmount)}.`,
  ];

  if (payload.statementUrl) {
    lines.push("Acesse sua fatura pelo link:", payload.statementUrl);
  }

  lines.push(
    "",
    "Recomendamos realizar o pagamento até a data de vencimento para evitar encargos.",
  );

  return lines.join("\n");
};

interface CreditLimitAlertPayload {
  to: string | string[];
  cardName: string;
  limitAmount: number;
  usedAmount: number;
  availableAmount: number;
}

export const sendCreditLimitAlertEmail = async (
  payload: CreditLimitAlertPayload,
) => {
  if (!mailer) {
    logger.info("Alerta de limite não enviado (SMTP inoperante)", {
      payload,
    });
    return;
  }

  const html = await renderCreditLimitAlertTemplate(payload);
  const text = renderCreditLimitAlertText(payload);

  await mailer.sendMail({
    from: smtpFrom,
    to: toAddress(payload.to),
    subject: `Atenção: limite do cartão ${payload.cardName} quase esgotado`,
    html,
    text,
  });
};

const renderCreditLimitAlertTemplate = async (
  payload: CreditLimitAlertPayload,
) => {
  const template = await loadTemplate("credit-limit-alert.html");
  return template
    .replace(/{{\s*CARD_NAME\s*}}/g, payload.cardName)
    .replace(/{{\s*LIMIT_AMOUNT\s*}}/g, formatCurrency(payload.limitAmount))
    .replace(/{{\s*USED_AMOUNT\s*}}/g, formatCurrency(payload.usedAmount))
    .replace(
      /{{\s*AVAILABLE_AMOUNT\s*}}/g,
      formatCurrency(payload.availableAmount),
    );
};

const renderCreditLimitAlertText = (payload: CreditLimitAlertPayload) => {
  return [
    `Olá!`,
    "",
    `O cartão ${payload.cardName} atingiu ${formatCurrency(payload.usedAmount)} de ${formatCurrency(payload.limitAmount)} do limite disponível.`,
    `Saldo restante: ${formatCurrency(payload.availableAmount)}.`,
    "",
    "Considere planejar novas compras ou ajustar seu orçamento para evitar estourar o limite.",
  ].join("\n");
};
