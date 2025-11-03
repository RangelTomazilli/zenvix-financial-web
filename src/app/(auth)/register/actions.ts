'use server';

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface RegisterState {
  error?: string;
}

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const redirectToRaw = formData.get("redirectTo");
  const redirectTo =
    typeof redirectToRaw === "string" && redirectToRaw.length > 0
      ? redirectToRaw
      : "/dashboard";

  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    logger.error("Erro no cadastro", error);
    return { error: error.message };
  }

  const userId = data.user?.id;

  if (!userId) {
    return {
      error:
        "Não foi possível concluir o cadastro. Verifique seu e-mail e tente novamente.",
    };
  }

  const profilePayload = {
    id: userId,
    user_id: userId,
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    role: "owner",
  } as const;

  if (supabaseAdmin) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });

    if (profileError) {
      logger.warn("Cadastro concluído, mas não foi possível preencher perfil", {
        error: profileError,
        payload: profilePayload,
      });
    }
  } else {
    logger.info(
      "Cadastro sem service role disponível; trigger handle_new_user cuidará do perfil",
      { userId },
    );
  }

  const loginParams = new URLSearchParams();
  if (redirectTo) {
    loginParams.set("redirect", redirectTo);
  }
  loginParams.set("email", parsed.data.email);
  loginParams.set("status", "registered");

  redirect(`/login${loginParams.size > 0 ? `?${loginParams.toString()}` : ""}`);
}
