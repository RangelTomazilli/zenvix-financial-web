import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listCategories } from "@/data/categories";
import { CategoriesBoard } from "@/components/categories/CategoriesBoard";

export default async function CategoriesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("user_id", user.id)
    .single<{ family_id: string | null }>();

  if (!profile?.family_id) {
    redirect("/family");
  }

  const categories = await listCategories(supabase, profile.family_id);

  const serialized = categories.map((category) => ({
    id: category.id,
    name: category.name,
    type: category.type,
  }));

  return <CategoriesBoard initialCategories={serialized} />;
}
