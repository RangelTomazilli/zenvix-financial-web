'use client';

import type { ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface MonthOption {
  value: string;
  label: string;
}

export const MonthFilter = ({
  options,
  selectedMonth,
}: {
  options: MonthOption[];
  selectedMonth: string;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    if (value) {
      params.set("month", value);
    } else {
      params.delete("month");
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor="dashboard-month-filter"
        className="text-sm font-medium text-slate-600"
      >
      </label>
      <select
        id="dashboard-month-filter"
        name="month"
        value={selectedMonth}
        onChange={handleChange}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
