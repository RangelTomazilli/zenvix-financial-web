import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { logger } from "@/lib/logger";

const sesAccessKeyId = process.env.SES_ACCESS_KEY_ID;
const sesSecretAccessKey = process.env.SES_SECRET_ACCESS_KEY;
const sesRegion = process.env.SES_REGION ?? "sa-east-1";
const sesFrom = process.env.SES_FROM_EMAIL ?? "convites@zenvix.com.br";

const sesClient =
  sesAccessKeyId && sesSecretAccessKey
    ? new SESv2Client({
        region: sesRegion,
        credentials: {
          accessKeyId: sesAccessKeyId,
          secretAccessKey: sesSecretAccessKey,
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
  if (!sesClient) {
    logger.info("E-mail de convite não enviado (credenciais SES ausentes)", {
      payload,
    });
    return;
  }

  try {
    const html = await renderInviteTemplate(payload);
    const command = new SendEmailCommand({
      FromEmailAddress: sesFrom,
      Destination: { ToAddresses: [payload.to] },
      Content: {
        Simple: {
          Subject: { Data: `Convite para ${payload.familyName}`, Charset: "UTF-8" },
          Body: {
            Html: {
              Data: html,
              Charset: "UTF-8",
            },
          },
        },
      },
    });

    await sesClient.send(command);
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
