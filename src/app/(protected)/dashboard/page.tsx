import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { CategoryDistribution } from "@/components/dashboard/CategoryDistribution";
import { MonthlyTrend } from "@/components/dashboard/MonthlyTrend";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import type { CategoryStat } from "@/components/dashboard/CategoryDistribution";
import type { MonthlyTrendItem } from "@/components/dashboard/MonthlyTrend";
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
    .single();

  if (!profile?.family_id) {
    redirect("/family");
  }

  const familyId = profile.family_id as string;

  const { data: familyRow } = await supabase
    .from("families")
    .select("currency_code")
    .eq("id", familyId)
    .single();

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

  const totals = (totalsData ?? []).reduce(
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

  const monthlyIncome = monthlyData?.reduce((sum, item) => {
    return item.type === "income" ? sum + (item.amount as number) : sum;
  }, 0) ?? 0;

  const monthlyExpense = monthlyData?.reduce((sum, item) => {
    return item.type === "expense" ? sum + (item.amount as number) : sum;
  }, 0) ?? 0;

  const categoryStats = (monthlyData ?? []).reduce<CategoryStat[]>(
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

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const sixMonthsIso = toISODate(sixMonthsAgo);

  const { data: rangeData } = await supabase
    .from("transactions")
    .select("amount, type, occurred_on")
    .eq("family_id", familyId)
    .gte("occurred_on", sixMonthsIso)
    .order("occurred_on", { ascending: true });

  const monthlyTrend = (rangeData ?? []).reduce<Record<string, MonthlyTrendItem>>(
    (acc, item) => {
      const monthKey = (item.occurred_on as string).slice(0, 7);
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          income: 0,
          expense: 0,
        };
      }
      if (item.type === "income") {
        acc[monthKey]!.income += item.amount as number;
      } else {
        acc[monthKey]!.expense += item.amount as number;
      }
      return acc;
    },
    {},
  );

  const monthlyTrendList = Object.values(monthlyTrend).sort((a, b) =>
    a.month.localeCompare(b.month),
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

  const recentItems: RecentTransactionItem[] = (latestTransactions ?? []).map(
    (item) => ({
      id: item.id as string,
      description: (item.description as string | null) ?? null,
      categoryName: (item.categories as { name: string } | null)?.name ?? null,
      amount: item.amount as number,
      type: item.type as "income" | "expense",
      occurredOn: item.occurred_on as string,
      createdBy: (item.profiles as { full_name: string | null } | null)
        ?.full_name ?? null,
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards
        balance={totalIncome - totalExpense}
        monthlyIncome={monthlyIncome}
        monthlyExpense={monthlyExpense}
        totalTransactions={transactionsCount ?? 0}
        currency={currency}
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MonthlyTrend data={monthlyTrendList} currency={currency} />
        </div>
        <div className="lg:col-span-2">
          <CategoryDistribution data={categoryStats} currency={currency} />
        </div>
      </div>
      <RecentTransactions data={recentItems} currency={currency} />
    </div>
  );
}
