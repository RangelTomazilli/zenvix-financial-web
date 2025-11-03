import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { logger } from "@/lib/logger";
import { ensureFamily, getCurrentProfile } from "@/data/families";
import type { Database, Profile } from "@/types/database";

async function resolveProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  fullName?: string | null,
  email?: string | null,
) {
  try {
    return await getCurrentProfile(supabase, userId);
  } catch (error: unknown) {
    logger.warn("Perfil não encontrado, criando novo", { userId, error });
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!profileError) {
      return data as Profile;
    }

    const insertedProfile = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        full_name: fullName ?? null,
        email: email ?? null,
        role: "owner",
      })
      .select("*")
      .single();

    if (insertedProfile.error) {
      logger.error("Falha ao criar perfil", {
        error: insertedProfile.error,
        payload: {
          userId,
          fullName,
          email,
        },
      });
      throw insertedProfile.error;
    }

    return insertedProfile.data as Profile;
  }
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await resolveProfile(
    supabase,
    user.id,
    (user.user_metadata as { full_name?: string })?.full_name,
    user.email,
  );

  const family = await ensureFamily(supabase, profile, user.email);

  return (
    <AppShell
      session={{
        user: { id: user.id, email: user.email ?? null },
        profile,
        family,
      }}
    >
      {children}
    </AppShell>
  );
}
