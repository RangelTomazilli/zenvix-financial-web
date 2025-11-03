import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { CategoryDistribution } from "@/components/dashboard/CategoryDistribution";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import type { CategoryStat } from "@/components/dashboard/CategoryDistribution";
import type { RecentTransactionItem } from "@/components/dashboard/RecentTransactions";

const toISODate = (date: Date) => date.toISOString().split("T")[0]!;

export default async function DashboardPage() {
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

  const familyId = profile.family_id as string;

  const { data: familyRow } = await supabase
    .from("families")
    .select("currency_code")
    .eq("id", familyId)
    .single<{ currency_code: string }>();

  const currency = familyRow?.currency_code ?? "BRL";

  const {
    data: totalsData,
    error: totalsError,
  } = await supabase
    .from("transactions")
    .select("amount, type")
    .eq("family_id", familyId);

  if (totalsError) {
    console.error("dashboard: erro ao buscar totais de transações", {
      familyId,
      totalsError,
    });
  }

  const totalsRows = (totalsData ?? []) as Array<{
    amount: number;
    type: "income" | "expense";
  }>;

  const totals = totalsRows.reduce(
    (acc, item) => {
      const amount = Number(item.amount) || 0;
      if (item.type === "income") {
        acc.income += amount;
      } else if (item.type === "expense") {
        acc.expense += amount;
      }
      return acc;
    },
    { income: 0, expense: 0 },
  );

  const totalIncome = totals.income;
  const totalExpense = totals.expense;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const monthStart = toISODate(startOfMonth);

  const { data: monthlyData } = await supabase
    .from("transactions")
    .select(
      `id, amount, type, occurred_on, description, category_id,
        categories ( id, name, type ),
        profiles ( full_name )
      `,
    )
    .eq("family_id", familyId)
    .gte("occurred_on", monthStart)
    .order("occurred_on", { ascending: false });

  const monthlyRows = (monthlyData ?? []) as Array<{
    amount: number;
    type: "income" | "expense";
    occurred_on: string;
    description: string | null;
    category_id: string | null;
    categories?: { id: string; name: string; type: "income" | "expense" } | null;
    profiles?: { full_name: string | null } | null;
  }>;

  const monthlyIncome = monthlyRows.reduce((sum, item) => {
    return item.type === "income" ? sum + (item.amount as number) : sum;
  }, 0);

  const monthlyExpense = monthlyRows.reduce((sum, item) => {
    return item.type === "expense" ? sum + (item.amount as number) : sum;
  }, 0);

  const categoryStats = monthlyRows.reduce<CategoryStat[]>(
    (acc, item) => {
      const category = item.categories as
        | { id: string; name: string; type: "income" | "expense" }
        | null
        | undefined;
      const targetId = category?.id ?? "uncategorized";
      const existing = acc.find((current) => current.id === targetId);
      if (existing) {
        existing.total += item.amount as number;
      } else {
        acc.push({
          id: targetId,
          name: category?.name ?? "Sem categoria",
          type: category?.type ?? item.type,
          total: item.amount as number,
        });
      }
      return acc;
    },
    [],
  );

  const { data: latestTransactions } = await supabase
    .from("transactions")
    .select(
      `id, amount, type, occurred_on, description,
        categories ( name ),
        profiles ( full_name )
      `,
    )
    .eq("family_id", familyId)
    .order("occurred_on", { ascending: false })
    .limit(8);

  const { count: transactionsCount } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId);

  const latestRows = (latestTransactions ?? []) as Array<{
    id: string;
    amount: number;
    type: "income" | "expense";
    occurred_on: string;
    description: string | null;
    categories: { name: string } | null;
    profiles: { full_name: string | null } | null;
  }>;

  const recentItems: RecentTransactionItem[] = latestRows.map((item) => ({
    id: item.id,
    description: item.description,
    categoryName: item.categories?.name ?? null,
    amount: item.amount,
    type: item.type,
    occurredOn: item.occurred_on,
    createdBy: item.profiles?.full_name ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards
        balance={totalIncome - totalExpense}
        monthlyIncome={monthlyIncome}
        monthlyExpense={monthlyExpense}
        totalTransactions={transactionsCount ?? 0}
        currency={currency}
      />
      <CategoryDistribution data={categoryStats} currency={currency} />
      <RecentTransactions data={recentItems} currency={currency} />
    </div>
  );
}
