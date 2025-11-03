import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface FamilyInvite {
  id: string;
  family_id: string;
  inviter_id: string;
  invitee_email: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  token: string;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
}

export const listFamilyInvites = async (client: Client, familyId: string) => {
  const { data, error } = await client
    .from("family_invites")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as FamilyInvite[];
};

export const getInviteByToken = async (client: Client, token: string) => {
  const { data, error } = await client
    .from("family_invites")
    .select("*")
    .eq("token", token)
    .single();

  if (error) {
    throw error;
  }

  return data as FamilyInvite;
};
