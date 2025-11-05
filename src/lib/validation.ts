import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Informe um e-mail válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export const registerSchema = loginSchema.extend({
  fullName: z
    .string()
    .min(3, "Nome muito curto")
    .max(120, "Nome muito longo"),
});

const parseCurrency = (value: string | number) => {
  if (typeof value === "number") {
    return value;
  }
  const normalized = value
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return Number(normalized);
};

const parseNumber = (value: string | number) => {
  if (typeof value === "number") {
    return value;
  }
  return Number(value.trim());
};

export const categorySchema = z.object({
  name: z.string().min(2, "Informe um nome para a categoria"),
  type: z.enum(["income", "expense"], {
    required_error: "Selecione o tipo da categoria",
  }),
});

export const transactionSchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .transform((value) => parseCurrency(value))
    .refine((value) => !Number.isNaN(value), "Valor inválido")
    .transform((value) => Math.round(value * 100) / 100)
    .refine((value) => Math.abs(value) > 0, "Informe um valor diferente de zero"),
  type: z.enum(["income", "expense"]),
  occurredOn: z.string().min(1, "Informe a data"),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  memberId: z.string().uuid().optional().nullable(),
});

export const profileUpdateSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Informe um nome com pelo menos 3 caracteres")
    .max(120, "Nome muito longo"),
  dialCode: z
    .string()
    .min(2, "Escolha o código do país")
    .max(6, "Código de país inválido")
    .regex(/^\+\d{1,4}$/, "Código inválido"),
  phoneNumber: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? "" : value.trim()))
    .refine(
      (value) => value === "" || /^[0-9\s().-]{6,20}$/.test(value),
      "Informe um número válido",
    ),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(6, "Informe sua senha atual"),
    newPassword: z
      .string()
      .min(6, "A nova senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })
  .refine(
    (value) => value.currentPassword !== value.newPassword,
    {
      message: "A nova senha deve ser diferente da senha atual",
      path: ["newPassword"],
    },
  );

export const familySchema = z.object({
  name: z.string().min(3, "Informe o nome da família"),
  currencyCode: z
    .string()
    .min(3)
    .max(3)
    .transform((value) => value.toUpperCase()),
});

export const creditCardSchema = z.object({
  name: z.string().min(2, "Informe um nome para o cartão"),
  nickname: z
    .string()
    .trim()
    .min(2, "Apelido muito curto")
    .max(60, "Apelido muito longo")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  brand: z
    .string()
    .trim()
    .max(40, "Marca muito longa")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  dueDay: z.coerce
    .number()
    .int()
    .min(1, "Dia de vencimento inválido")
    .max(31, "Dia de vencimento inválido"),
  billingDay: z
    .preprocess(
      (value) =>
        value === "" || value === null || value === undefined ? undefined : value,
      z
        .coerce
        .number()
        .int()
        .min(1, "Dia de fechamento inválido")
        .max(31, "Dia de fechamento inválido"),
    )
    .optional(),
  closingOffsetDays: z
    .coerce
    .number()
    .int()
    .min(1, "Offset mínimo é 1 dia")
    .max(20, "Offset máximo é 20 dias")
    .default(7),
  creditLimit: z
    .union([z.string(), z.number()])
    .transform((value) => {
      if (value === "" || value === null || value === undefined) {
        return null;
      }
      const parsed = parseCurrency(value);
      return Number.isNaN(parsed) ? null : Math.round(parsed * 100) / 100;
    })
    .optional()
    .transform((value) => (value ?? null)),
  notifyThreshold: z
    .union([z.string(), z.number()])
    .transform((value) => {
      if (value === "" || value === null || value === undefined) {
        return null;
      }
      const parsed = parseNumber(value);
      return Number.isNaN(parsed) ? null : parsed;
    })
    .refine(
      (value) => value === null || (value >= 0 && value <= 100),
      "Informe um percentual entre 0 e 100",
    )
    .optional()
    .transform((value) => (value ?? null)),
  notifyDaysBefore: z
    .coerce
    .number()
    .int()
    .min(1, "Informe pelo menos 1 dia de antecedência")
    .max(15, "Máximo de 15 dias de antecedência")
    .default(5),
  ownerProfileId: z.string().uuid().optional().nullable(),
});

export const creditCardUpdateSchema = creditCardSchema.partial();

export const creditCardPurchaseSchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .transform((value) => Math.round(parseCurrency(value) * 100) / 100)
    .refine((value) => value > 0, "Informe um valor maior que zero"),
  installments: z
    .coerce
    .number()
    .int()
    .min(1, "Parcela mínima é 1")
    .max(48, "Parcela máxima é 48"),
  purchaseDate: z.string().min(1, "Informe a data da compra"),
  description: z
    .string()
    .trim()
    .max(180, "Descrição muito longa")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  merchant: z
    .string()
    .trim()
    .max(120, "Nome do estabelecimento muito longo")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  categoryId: z.string().uuid().optional().nullable(),
  profileId: z.string().uuid().optional().nullable(),
});

export const statementUpdateSchema = z.object({
  status: z.enum(["open", "closed", "paid", "overdue"]),
  paidAmount: z
    .union([z.string(), z.number()])
    .transform((value) => {
      if (value === "" || value === null || value === undefined) {
        return null;
      }
      const parsed = parseCurrency(value);
      return Number.isNaN(parsed) ? null : Math.round(parsed * 100) / 100;
    })
    .optional()
    .transform((value) => (value ?? null)),
  paymentDate: z.string().optional().nullable(),
});
