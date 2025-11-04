import {
  SummaryCardsSkeleton,
  CategoryDistributionSkeleton,
  MemberBreakdownSkeleton,
  RecentTransactionsSkeleton,
} from "@/components/dashboard/Skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-6 w-48 rounded-lg bg-slate-200/80" />
          <div className="mt-2 h-4 w-64 rounded-full bg-slate-200/60" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-slate-200/70" />
      </div>
      <SummaryCardsSkeleton />
      <CategoryDistributionSkeleton />
      <MemberBreakdownSkeleton />
      <div
        className="overflow-x-auto rounded-lg border border-slate-100"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <RecentTransactionsSkeleton />
      </div>
    </div>
  );
}
