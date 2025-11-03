import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Family, Profile } from "@/types/database";

type Client = SupabaseClient<Database>;

export const getCurrentProfile = async (client: Client, userId: string) => {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
};

export const ensureFamily = async (
  client: Client,
  profile: Profile,
  userEmail?: string | null,
) => {
  if (profile.family_id) {
    const { data, error } = await client
      .from("families")
      .select("*")
      .eq("id", profile.family_id)
      .single();

    if (error) {
      throw error;
    }

    return data as Family;
  }

  const defaultName = userEmail
    ? `Família de ${userEmail.split("@")[0]}`
    : "Família";

  const newFamilyId = randomUUID();

  const { error: insertError } = await client
    .from("families")
    .insert({
      id: newFamilyId,
      name: defaultName,
      currency_code: "BRL",
    }, { returning: "minimal" });

  if (insertError) {
    console.error("ensureFamily: erro ao criar família", {
      insertError,
      userId: profile.user_id,
    });
    throw insertError;
  }

  const { error: updateError } = await client
    .from("profiles")
    .update({ family_id: newFamilyId, role: "owner" })
    .eq("id", profile.id);

  if (updateError) {
    console.error("ensureFamily: erro ao vincular perfil à família", {
      updateError,
      profileId: profile.id,
      familyId: newFamilyId,
    });
    throw updateError;
  }

  const { data: createdFamily, error: fetchError } = await client
    .from("families")
    .select("*")
    .eq("id", newFamilyId)
    .single();

  if (fetchError) {
    console.error("ensureFamily: erro ao buscar família criada", {
      fetchError,
      familyId: newFamilyId,
    });
    throw fetchError;
  }

  return createdFamily as Family;
};

export const updateFamily = async (
  client: Client,
  familyId: string,
  patch: Partial<Pick<Family, "name" | "currency_code">>,
) => {
  const { data, error } = await client
    .from("families")
    .update({
      name: patch.name,
      currency_code: patch.currency_code,
    })
    .eq("id", familyId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Family;
};

export const listFamilyMembers = async (client: Client, familyId: string) => {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("family_id", familyId)
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return data as Profile[];
};

export const addMemberByEmail = async (
  client: Client,
  familyId: string,
  email: string,
) => {
  const { data: profile, error } = await client
    .from("profiles")
    .select("*")
    .ilike("email", email)
    .single();

  if (error) {
    throw error;
  }

  if (!profile) {
    throw new Error("Usuário não encontrado");
  }

  const { data: updated, error: updateError } = await client
    .from("profiles")
    .update({ family_id: familyId, role: "member" })
    .eq("id", profile.id)
    .select("*")
    .single();

  if (updateError) {
    throw updateError;
  }

  return updated as Profile;
};

export const removeMember = async (
  client: Client,
  familyId: string,
  profileId: string,
) => {
  const { error } = await client.rpc("remove_family_member", {
    p_family_id: familyId,
    p_profile_id: profileId,
  });

  if (error) {
    throw error;
  }
};
