import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listTransactions } from "@/data/transactions";
import { listCategories } from "@/data/categories";
import { listFamilyMembers } from "@/data/families";
import { TransactionsBoard } from "@/components/transactions/TransactionsBoard";

export default async function TransactionsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, family_id, full_name")
    .eq("user_id", user.id)
    .single<{ id: string; family_id: string | null; full_name: string | null }>();

  if (!profile?.family_id) {
    redirect("/family");
  }

  const { data: family } = await supabase
    .from("families")
    .select("currency_code")
    .eq("id", profile.family_id)
    .single<{ currency_code: string }>();

  const [transactions, categories, members] = await Promise.all([
    listTransactions(supabase, profile.family_id),
    listCategories(supabase, profile.family_id),
    listFamilyMembers(supabase, profile.family_id),
  ]);

  const serializedTransactions = transactions.map((transaction) => ({
    id: transaction.id,
    amount: Number(transaction.amount),
    type: transaction.type,
    occurredOn: transaction.occurred_on,
    categoryId: transaction.category_id,
    categoryName: transaction.categories?.name ?? null,
    description: transaction.description,
    memberId: transaction.user_id,
    memberName: transaction.profiles?.full_name ?? null,
    memberEmail: transaction.profiles?.email ?? null,
  }));

  const serializedCategories = categories.map((category) => ({
    id: category.id,
    name: category.name,
    type: category.type,
  }));

  return (
    <TransactionsBoard
      initialTransactions={serializedTransactions}
      categories={serializedCategories}
      currency={family?.currency_code ?? "BRL"}
      currentUser={profile.full_name ?? user.email ?? "Você"}
      members={members.map((member) => ({
        id: member.id,
        name: member.full_name,
        email: member.email ?? null,
      }))}
    />
  );
}
