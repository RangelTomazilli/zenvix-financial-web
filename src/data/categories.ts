import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Category,
  Database,
  TransactionType,
} from "@/types/database";

type Client = SupabaseClient<Database>;

export interface CategoryInput {
  familyId: string;
  name: string;
  type: TransactionType;
}

export const listCategories = async (client: Client, familyId: string) => {
  const { data, error } = await client
    .from("categories")
    .select("*")
    .eq("family_id", familyId)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data as Category[];
};

export const createCategory = async (client: Client, input: CategoryInput) => {
  const { data, error } = await client
    .from("categories")
    .insert({
      family_id: input.familyId,
      name: input.name,
      type: input.type,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const updateCategory = async (
  client: Client,
  categoryId: string,
  familyId: string,
  patch: Partial<Omit<Category, "id" | "family_id" | "created_at">>,
) => {
  const { data, error } = await client
    .from("categories")
    .update({
      name: patch.name,
      type: patch.type,
    })
    .eq("id", categoryId)
    .eq("family_id", familyId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const deleteCategory = async (
  client: Client,
  categoryId: string,
  familyId: string,
) => {
  const { error } = await client
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("family_id", familyId);

  if (error) {
    throw error;
  }
};
