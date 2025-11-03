import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureFamily, listFamilyMembers } from "@/data/families";
import { listFamilyInvites } from "@/data/invites";
import type { Profile } from "@/types/database";
import { FamilyBoard } from "@/components/family/FamilyBoard";

export default async function FamilyPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login");
  }

  const typedProfile = profile as Profile;
  const family = await ensureFamily(supabase, typedProfile, user.email);
  const members = await listFamilyMembers(supabase, family.id);
  const invites = await listFamilyInvites(supabase, family.id);

  return (
    <FamilyBoard
      family={family}
      members={members}
      currentProfileId={typedProfile.id}
      currentProfileRole={typedProfile.role}
      invites={invites}
    />
  );
}
