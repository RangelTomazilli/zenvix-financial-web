import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreditCard,
  CreditCardStatement,
  Database,
  Profile,
} from "@/types/database";
import { sendCreditLimitAlertEmail, sendStatementReminderEmail } from "@/lib/email";
import { currentAppUrl } from "@/utils/url";
import { logger } from "@/lib/logger";
import { getCardUsage } from "@/data/creditCards";

type Client = SupabaseClient<Database>;

const formatDate = (value: string) =>
  format(new Date(value), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

export const sendStatementReminder = async (
  client: Client,
  statementId: string,
  options?: { statementUrl?: string },
) => {
  const { data, error } = await client
    .from("credit_card_statements")
    .select(
      `
        *,
        card:credit_cards!inner (
          id,
          name,
          family_id,
          notify_days_before,
          owner_profile_id
        )
      `,
    )
    .eq("id", statementId)
    .maybeSingle<CreditCardStatement & { card: CreditCard }>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Fatura não encontrada");
  }

  const recipients = await collectRecipients(client, data.card);

  if (recipients.length === 0) {
    logger.info("Nenhum destinatário para lembrete de fatura", {
      statementId,
      cardId: data.card.id,
    });
    return;
  }

  await sendStatementReminderEmail({
    to: recipients,
    cardName: data.card.name,
    dueDate: formatDate(data.due_date),
    totalAmount: data.total_amount ?? 0,
    statementUrl:
      options?.statementUrl ??
      `${currentAppUrl()}/cards/${data.card.id}/statements/${statementId}`,
  });
};

export const sendCreditLimitAlert = async (
  client: Client,
  card: CreditCard,
) => {
  if (!card.credit_limit || card.credit_limit <= 0) {
    return;
  }

  if (card.notify_threshold === null || card.notify_threshold === undefined) {
    return;
  }

  const usage = await getCardUsage(client, card.id);
  const used = usage.totalOutstanding;
  const limit = card.credit_limit;
  const percent = (used / limit) * 100;

  if (percent < card.notify_threshold) {
    return;
  }

  const available = Math.max(limit - used, 0);
  const recipients = await collectRecipients(client, card);

  if (recipients.length === 0) {
    logger.info("Nenhum destinatário para alerta de limite", {
      cardId: card.id,
    });
    return;
  }

  await sendCreditLimitAlertEmail({
    to: recipients,
    cardName: card.name,
    limitAmount: limit,
    usedAmount: used,
    availableAmount: available,
  });
};

const collectRecipients = async (client: Client, card: CreditCard) => {
  const emails = new Set<string>();

  if (card.owner_profile_id) {
    const { data, error } = await client
      .from("profiles")
      .select("email")
      .eq("id", card.owner_profile_id)
      .maybeSingle<{ email: string | null }>();

    if (!error && data?.email) {
      emails.add(data.email);
    }
  }

  const { data: owners, error: ownersError } = await client
    .from("profiles")
    .select("email")
    .eq("family_id", card.family_id)
    .eq("role", "owner");

  if (ownersError) {
    throw ownersError;
  }

  for (const owner of (owners ?? []) as Pick<Profile, "email">[]) {
    if (owner.email) {
      emails.add(owner.email);
    }
  }

  return Array.from(emails);
};
