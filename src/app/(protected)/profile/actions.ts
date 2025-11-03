'use server';

import { revalidatePath } from "next/cache";
import { profileUpdateSchema, changePasswordSchema } from "@/lib/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface ProfileFormState {
  status?: "success" | "error";
  message?: string;
  errors?: Partial<Record<"fullName" | "phone", string>>;
  profile?: {
    fullName: string;
    phone: string | null;
  };
}

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const rawFullName = formData.get("fullName");
  const rawDialCode = formData.get("dialCode");
  const rawPhoneNumber = formData.get("phoneNumber");

  const parsed = profileUpdateSchema.safeParse({
    fullName: typeof rawFullName === "string" ? rawFullName : "",
    dialCode: typeof rawDialCode === "string" ? rawDialCode : "",
    phoneNumber: typeof rawPhoneNumber === "string" ? rawPhoneNumber : undefined,
  });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return {
      status: "error",
      message: "Corrija os campos destacados e tente novamente.",
      errors: {
        fullName: fieldErrors.fullName?.[0],
        phone: fieldErrors.phoneNumber?.[0] ?? fieldErrors.dialCode?.[0],
      },
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "Sessão expirada. Faça login novamente.",
    };
  }

  const cleanedNumber = parsed.data.phoneNumber.replace(/\s+/g, "");
  const rawDigits = cleanedNumber.replace(/[().-]/g, "");
  const phone =
    rawDigits.length > 0 ? `${parsed.data.dialCode} ${rawDigits}` : null;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone,
    } as never)
    .eq("user_id", user.id);

  if (updateError) {
    logger.error("updateProfileAction: erro ao atualizar perfil", {
      userId: user.id,
      updateError,
    });
    return {
      status: "error",
      message: "Não foi possível atualizar o perfil. Tente novamente mais tarde.",
    };
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: parsed.data.fullName },
  });

  if (authError) {
    logger.warn(
      "updateProfileAction: não foi possível atualizar metadados do usuário",
      {
        userId: user.id,
        authError,
      },
    );
  }

  revalidatePath("/profile");

  return {
    status: "success",
    message: "Perfil atualizado com sucesso!",
    profile: {
      fullName: parsed.data.fullName,
      phone,
    },
  };
}

interface PasswordFormState {
  status?: "success" | "error";
  message?: string;
  errors?: Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>;
}

export async function changePasswordAction(
  _prevState: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return {
      status: "error",
      message:
        fieldErrors.confirmPassword?.[0]
          ?? fieldErrors.newPassword?.[0]
          ?? fieldErrors.currentPassword?.[0]
          ?? "Corrija os campos destacados e tente novamente.",
      errors: {
        currentPassword: fieldErrors.currentPassword?.[0],
        newPassword: fieldErrors.newPassword?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      },
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return {
      status: "error",
      message: "Sessão expirada. Faça login novamente.",
    };
  }

  const verify = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });

  if (verify.error) {
    return {
      status: "error",
      message: "Senha atual incorreta.",
      errors: {
        currentPassword: "Senha atual incorreta.",
      },
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateError) {
    logger.error("changePasswordAction: erro ao atualizar senha", {
      userId: user.id,
      updateError,
    });
    return {
      status: "error",
      message:
        updateError.message ?? "Não foi possível atualizar a senha.",
    };
  }

  revalidatePath("/profile");

  return {
    status: "success",
    message: "Senha atualizada com sucesso!",
  };
}
