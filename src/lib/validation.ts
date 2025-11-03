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

export const categorySchema = z.object({
  name: z.string().min(2, "Informe um nome para a categoria"),
  type: z.enum(["income", "expense"], {
    required_error: "Selecione o tipo da categoria",
  }),
});

export const transactionSchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .transform((value) => {
      if (typeof value === "number") {
        return value;
      }
      const normalized = value.replace(/\./g, "").replace(",", ".");
      return Number(normalized);
    })
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
