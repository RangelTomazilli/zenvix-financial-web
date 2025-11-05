import { Suspense } from "react";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  SummaryCardsSkeleton,
  CategoryDistributionSkeleton,
  MemberBreakdownSkeleton,
  RecentTransactionsSkeleton,
  CreditCardInstallmentsSkeleton,
} from "@/components/dashboard/Skeletons";
import { MonthFilter } from "@/components/dashboard/MonthFilter";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { CategoryDistribution } from "@/components/dashboard/CategoryDistribution";
import { MemberBreakdown } from "@/components/dashboard/MemberBreakdown";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { CreditCardInstallments } from "@/components/dashboard/CreditCardInstallments";
import type { CategoryStat } from "@/components/dashboard/CategoryDistribution";
import type { RecentTransactionItem } from "@/components/dashboard/RecentTransactions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const toISODate = (date: Date) => date.toISOString().split("T")[0]!;
const monthRegex = /^\d{4}-\d{2}$/;

const formatMonthLabel = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, 1);
  return format(date, "LLLL yyyy", { locale: ptBR });
};

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const fetchDashboardData = async ({
  familyId,
  selectedMonth,
}: {
  familyId: string;
  selectedMonth: string;
}) => {
  const supabase = await createSupabaseServerClient();

  const [year, month] = selectedMonth.split("-").map(Number);
  const startDate = new Date(year ?? 0, (month ?? 1) - 1, 1);
  const endDate = new Date(year ?? 0, (month ?? 1), 1);
  const startISO = toISODate(startDate);
  const endISO = toISODate(endDate);

  const { data: familyRow } = await supabase
    .from("families")
    .select("currency_code")
    .eq("id", familyId)
    .single<{ currency_code: string }>();

  const currency = familyRow?.currency_code ?? "BRL";

  const { data: monthlyData } = await supabase
    .from("transactions")
    .select(
      `id, user_id, amount, type, occurred_on, description, category_id,
        categories ( id, name, type ),
        profiles ( id, full_name, email )
      `,
    )
    .eq("family_id", familyId)
    .gte("occurred_on", startISO)
    .lt("occurred_on", endISO)
    .order("occurred_on", { ascending: false });

  const { data: cardRows } = await supabase
    .from("credit_cards")
    .select("id")
    .eq("family_id", familyId);

  const cardIds = ((cardRows ?? []) as Array<{ id: string }>).map(
    (row) => row.id,
  );

  let creditCardInstallments: Array<{
    id: string;
    cardId: string;
    cardName: string;
    description: string | null;
    merchant: string | null;
    amount: number;
    status: "pending" | "billed" | "paid" | "cancelled";
    dueDate: string;
    installmentNumber: number;
    totalInstallments: number;
    category: { id: string; name: string; type: "income" | "expense" } | null;
    profile: { id: string; full_name: string | null; email: string | null } | null;
  }> = [];

  if (cardIds.length > 0) {
    const { data: installmentsData, error: installmentsError } = await supabase
      .from("credit_card_installments")
      .select(
        `id, amount, status, installment_number, due_date, competence_month,
          purchase:credit_card_purchases!inner(
            id,
            description,
            merchant,
            installments,
            card_id,
            category:categories(id, name, type),
            profile:profiles(id, full_name, email),
            card:credit_cards!inner(id, name)
          )
        `,
      )
      .gte("competence_month", startISO)
      .lt("competence_month", endISO)
      .in("purchase.card_id", cardIds)
      .not("status", "eq", "cancelled")
      .order("due_date", { ascending: true });

    if (installmentsError) {
      console.error("dashboard: erro ao buscar parcelas", {
        familyId,
        error: installmentsError,
      });
    } else {
      const rows = (installmentsData ?? []) as Array<{
        id: string;
        amount: number;
        status: "pending" | "billed" | "paid" | "cancelled";
        installment_number: number;
        due_date: string;
        purchase: {
          id: string;
          description: string | null;
          merchant: string | null;
          installments: number;
          card_id: string;
          card: { id: string; name: string | null } | null;
          category: { id: string; name: string; type: "income" | "expense" } | null;
          profile: { id: string; full_name: string | null; email: string | null } | null;
        };
      }>;

      creditCardInstallments = rows.map((row) => ({
        id: row.id,
        cardId: row.purchase.card_id,
        cardName: row.purchase.card?.name ?? "Cartão",
        description: row.purchase.description,
        merchant: row.purchase.merchant,
        amount: Number(row.amount) || 0,
        status: row.status,
        dueDate: row.due_date,
        installmentNumber: row.installment_number,
        totalInstallments: row.purchase.installments ?? 1,
        category: row.purchase.category,
        profile: row.purchase.profile,
      }));
    }
  }

  const monthlyRows = (monthlyData ?? []) as Array<{
    id: string;
    amount: number;
    type: "income" | "expense";
    occurred_on: string;
    description: string | null;
    category_id: string | null;
    user_id: string | null;
    categories?: { id: string; name: string; type: "income" | "expense" } | null;
    profiles?: { id: string; full_name: string | null; email: string | null } | null;
  }>;

  const monthlyIncome = monthlyRows.reduce((sum, item) => {
    return item.type === "income" ? sum + (item.amount as number) : sum;
  }, 0);

  const monthlyExpense = monthlyRows.reduce((sum, item) => {
    return item.type === "expense" ? sum + (item.amount as number) : sum;
  }, 0);

  const categoryAccumulator = new Map<string, CategoryStat>();

  const pushCategory = (
    category:
      | { id: string; name: string; type: "income" | "expense" }
      | null
      | undefined,
    fallback: { id: string; name: string; type: "income" | "expense" },
    amount: number,
  ) => {
    const targetId = category?.id ?? fallback.id;
    const existing = categoryAccumulator.get(targetId);
    if (existing) {
      existing.total += amount;
      return;
    }
    categoryAccumulator.set(targetId, {
      id: targetId,
      name: category?.name ?? fallback.name,
      type: category?.type ?? fallback.type,
      total: amount,
    });
  };

  for (const item of monthlyRows) {
    const category = item.categories as
      | { id: string; name: string; type: "income" | "expense" }
      | null
      | undefined;
    pushCategory(
      category,
      {
        id: "uncategorized",
        name: "Sem categoria",
        type: item.type,
      },
      Number(item.amount),
    );
  }

  for (const installment of creditCardInstallments) {
    const fallbackCategory = installment.category
      ? {
          id: `credit-card-${installment.category.id}`,
          name: `${installment.category.name} (Cartão)`,
          type: installment.category.type,
        }
      : {
          id: `credit-card-${installment.cardId}`,
          name: `${installment.cardName} (Cartão)`,
          type: "expense" as const,
        };

    pushCategory(null, fallbackCategory, installment.amount);
  }

  const categoryStats = Array.from(categoryAccumulator.values());

  const recentItems: RecentTransactionItem[] = monthlyRows.slice(0, 8).map((item) => ({
    id: item.id,
    description: item.description,
    categoryName: item.categories?.name ?? null,
    amount: item.amount,
    type: item.type,
    occurredOn: item.occurred_on,
    createdBy: item.profiles?.full_name ?? null,
  }));

  const UNASSIGNED_MEMBER_ID = "unassigned-member";

  const memberStatsMap = new Map<
    string,
    {
      name: string | null;
      email: string | null;
      income: number;
      expense: number;
    }
  >();

  for (const item of monthlyRows) {
    const profileId = item.user_id ?? UNASSIGNED_MEMBER_ID;
    const existing = memberStatsMap.get(profileId) ?? {
      name:
        profileId === UNASSIGNED_MEMBER_ID
          ? "Sem responsável"
          : item.profiles?.full_name ?? null,
      email: profileId === UNASSIGNED_MEMBER_ID ? null : item.profiles?.email ?? null,
      income: 0,
      expense: 0,
    };

    if (existing.name === null) {
      existing.name =
        profileId === UNASSIGNED_MEMBER_ID
          ? "Sem responsável"
          : item.profiles?.full_name ?? null;
    }
    if (existing.email === null && profileId !== UNASSIGNED_MEMBER_ID) {
      existing.email = item.profiles?.email ?? null;
    }

    if (item.type === "income") {
      existing.income += Number(item.amount) || 0;
    } else if (item.type === "expense") {
      existing.expense += Number(item.amount) || 0;
    }

    memberStatsMap.set(profileId, existing);
  }

  for (const installment of creditCardInstallments) {
    const profileId =
      installment.profile?.id ?? UNASSIGNED_MEMBER_ID;
    const existing = memberStatsMap.get(profileId) ?? {
      name:
        profileId === UNASSIGNED_MEMBER_ID
          ? "Sem responsável"
          : installment.profile?.full_name ?? null,
      email:
        profileId === UNASSIGNED_MEMBER_ID
          ? null
          : installment.profile?.email ?? null,
      income: 0,
      expense: 0,
    };

    if (existing.name === null) {
      existing.name =
        profileId === UNASSIGNED_MEMBER_ID
          ? "Sem responsável"
          : installment.profile?.full_name ?? null;
    }
    if (existing.email === null && profileId !== UNASSIGNED_MEMBER_ID) {
      existing.email = installment.profile?.email ?? null;
    }

    existing.expense += installment.amount;
    memberStatsMap.set(profileId, existing);
  }

  const memberContributions = Array.from(memberStatsMap.entries())
    .map(([id, stats]) => ({
      id,
      name: stats.name ?? (id === UNASSIGNED_MEMBER_ID ? "Sem responsável" : null),
      email: id === UNASSIGNED_MEMBER_ID ? null : stats.email,
      income: stats.income,
      expense: stats.expense,
      incomeShare: monthlyIncome > 0 ? (stats.income / monthlyIncome) * 100 : 0,
      expenseShare: monthlyExpense > 0 ? (stats.expense / monthlyExpense) * 100 : 0,
    }))
    .sort((a, b) => {
      const incomeDiff = b.income - a.income;
      if (incomeDiff !== 0) return incomeDiff;
      return b.expense - a.expense;
    });

  const creditCardInstallmentsTotal = creditCardInstallments.reduce(
    (sum, item) => sum + item.amount,
    0,
  );

  const monthlyExpenseTotal = monthlyExpense + creditCardInstallmentsTotal;

  return {
    currency,
    monthlyIncome,
    monthlyExpenseTotal,
    categoryStats,
    memberContributions,
    recentItems,
    totalTransactions: monthlyRows.length,
    creditCardInstallments,
    creditCardInstallmentsTotal,
  };
};

const fetchMonths = async (familyId: string, selectedMonth: string) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("occurred_on")
    .eq("family_id", familyId)
    .order("occurred_on", { ascending: false });

  if (error) {
    console.error("dashboard: erro ao buscar meses disponíveis", {
      familyId,
      error,
    });
  }

  const monthSet = new Set<string>();
  const monthRows = (data ?? []) as Array<{ occurred_on: string }>;
  for (const row of monthRows) {
    if (!row.occurred_on) continue;
    monthSet.add(row.occurred_on.slice(0, 7));
  }
  if (!monthSet.has(selectedMonth)) {
    monthSet.add(selectedMonth);
  }

  return Array.from(monthSet)
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({
      value,
      label: formatMonthLabel(value),
    }));
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;

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
  const currentMonth = toISODate(new Date()).slice(0, 7);
  const monthParam = typeof params?.month === "string" ? params.month : undefined;
  const selectedMonth = monthParam && monthRegex.test(monthParam) ? monthParam : currentMonth;

  const monthOptions = await fetchMonths(familyId, selectedMonth);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Visão geral financeira
          </h1>
          <p className="text-sm text-slate-500">
            Dados consolidados de {formatMonthLabel(selectedMonth)}.
          </p>
        </div>
        <MonthFilter options={monthOptions} selectedMonth={selectedMonth} />
      </div>
      <Suspense
        key={`summary-${selectedMonth}`}
        fallback={<SummaryCardsSkeleton />}
      >
        <SummarySection familyId={familyId} selectedMonth={selectedMonth} />
      </Suspense>
      <Suspense
        key={`category-${selectedMonth}`}
        fallback={<CategoryDistributionSkeleton />}
      >
        <CategorySection familyId={familyId} selectedMonth={selectedMonth} />
      </Suspense>
      <Suspense
        key={`installments-${selectedMonth}`}
        fallback={<CreditCardInstallmentsSkeleton />}
      >
        <InstallmentsSection familyId={familyId} selectedMonth={selectedMonth} />
      </Suspense>
      <div className="flex flex-col gap-6">
        <Suspense
          key={`members-${selectedMonth}`}
          fallback={<MemberBreakdownSkeleton />}
        >
          <MembersSection familyId={familyId} selectedMonth={selectedMonth} />
        </Suspense>
        <Suspense
          key={`recent-${selectedMonth}`}
          fallback={<RecentTransactionsSkeleton />}
        >
          <RecentSection familyId={familyId} selectedMonth={selectedMonth} />
        </Suspense>
      </div>
    </div>
  );
}

const SummarySection = async ({
  familyId,
  selectedMonth,
}: {
  familyId: string;
  selectedMonth: string;
}) => {
  const data = await fetchDashboardData({ familyId, selectedMonth });

  return (
    <SummaryCards
      balance={data.monthlyIncome - data.monthlyExpenseTotal}
      monthlyIncome={data.monthlyIncome}
      monthlyExpenseTotal={data.monthlyExpenseTotal}
      installmentTotal={data.creditCardInstallmentsTotal}
      totalTransactions={data.totalTransactions}
      currency={data.currency}
    />
  );
};

const InstallmentsSection = async ({
  familyId,
  selectedMonth,
}: {
  familyId: string;
  selectedMonth: string;
}) => {
  const data = await fetchDashboardData({ familyId, selectedMonth });
  return (
    <CreditCardInstallments
      data={data.creditCardInstallments}
      currency={data.currency}
    />
  );
};

const CategorySection = async ({
  familyId,
  selectedMonth,
}: {
  familyId: string;
  selectedMonth: string;
}) => {
  const data = await fetchDashboardData({ familyId, selectedMonth });
  return <CategoryDistribution data={data.categoryStats} currency={data.currency} />;
};

const MembersSection = async ({
  familyId,
  selectedMonth,
}: {
  familyId: string;
  selectedMonth: string;
}) => {
  const data = await fetchDashboardData({ familyId, selectedMonth });
  return <MemberBreakdown data={data.memberContributions} currency={data.currency} />;
};

const RecentSection = async ({
  familyId,
  selectedMonth,
}: {
  familyId: string;
  selectedMonth: string;
}) => {
  const data = await fetchDashboardData({ familyId, selectedMonth });
  return <RecentTransactions data={data.recentItems} currency={data.currency} />;
};
