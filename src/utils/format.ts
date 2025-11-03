import { format, parseISO } from "date-fns";

export const formatCurrency = (
  value: number,
  currency = "BRL",
  locale = "pt-BR",
) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

export const formatDate = (value: string | Date) => {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "dd/MM/yyyy");
};
