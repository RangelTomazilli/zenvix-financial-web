export const SkeletonLine = ({ width }: { width: string }) => (
  <div
    className="h-3 rounded-full bg-slate-200/80"
    style={{ width }}
  />
);

export const SummaryCardsSkeleton = () => (
  <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
    {[...Array(4).keys()].map((key) => (
      <div
        key={key}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <SkeletonLine width="60%" />
        <div className="h-6 rounded-lg bg-slate-200/70" />
      </div>
    ))}
  </section>
);

export const CardSkeleton = ({
  lines = 3,
}: {
  lines?: number;
}) => (
  <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <SkeletonLine width="180px" />
        <SkeletonLine width="220px" />
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100" />
    </div>
    <div className="space-y-3">
      {[...Array(lines).keys()].map((index) => (
        <div
          key={index}
          className="h-5 rounded-lg bg-slate-200/60"
        />
      ))}
    </div>
  </section>
);

export const CategoryDistributionSkeleton = () => (
  <CardSkeleton lines={6} />
);

export const MemberBreakdownSkeleton = () => (
  <CardSkeleton lines={5} />
);

export const RecentTransactionsSkeleton = () => (
  <CardSkeleton lines={8} />
);
