'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const signOut = async () => {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    logger.error("Erro ao encerrar sessão", error);
    throw error;
  }
};
