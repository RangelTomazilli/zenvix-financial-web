import {
  addDays,
  addMonths,
  format,
  lastDayOfMonth,
  set,
  startOfMonth,
  subDays,
} from "date-fns";

const clampDay = (reference: Date, day: number) => {
  const lastDay = lastDayOfMonth(reference).getDate();
  const targetDay = Math.min(Math.max(day, 1), lastDay);
  return set(reference, { date: targetDay });
};

const toISODate = (date: Date) => format(date, "yyyy-MM-dd");

export const resolveDueDate = (anchor: Date, dueDay: number) => {
  return clampDay(anchor, dueDay);
};

export const calculateFirstDueDate = (
  purchaseDate: Date,
  dueDay: number,
  closingOffsetDays: number,
) => {
  let dueDate = resolveDueDate(purchaseDate, dueDay);
  if (dueDate <= purchaseDate) {
    dueDate = resolveDueDate(addMonths(purchaseDate, 1), dueDay);
  }

  while (true) {
    const closingDate = subDays(dueDate, closingOffsetDays);
    if (purchaseDate <= closingDate) {
      return dueDate;
    }
    dueDate = resolveDueDate(addMonths(dueDate, 1), dueDay);
  }
};

export interface Installment {
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  competenceMonth: Date;
}

export interface InstallmentSchedule {
  firstDueDate: Date;
  firstInstallmentMonth: Date;
  installments: Installment[];
}

export const generateInstallmentSchedule = ({
  purchaseDate,
  totalAmount,
  installments,
  dueDay,
  closingOffsetDays,
}: {
  purchaseDate: Date;
  totalAmount: number;
  installments: number;
  dueDay: number;
  closingOffsetDays: number;
}): InstallmentSchedule => {
  const cents = Math.round(totalAmount * 100);
  const base = Math.floor(cents / installments);
  const remainder = cents - base * installments;

  const firstDueDate = calculateFirstDueDate(
    purchaseDate,
    dueDay,
    closingOffsetDays,
  );

  const schedule: Installment[] = new Array(installments).fill(null).map(
    (_, index) => {
      const addMonthsCount = index;
      const rawDueDate = addMonths(firstDueDate, addMonthsCount);
      const dueDate = resolveDueDate(rawDueDate, dueDay);
      const monthStart = startOfMonth(dueDate);

      const amountCents = base + (index < remainder ? 1 : 0);
      const amount = amountCents / 100;

      return {
        installmentNumber: index + 1,
        amount,
        dueDate,
        competenceMonth: monthStart,
      };
    },
  );

  return {
    firstDueDate,
    firstInstallmentMonth: startOfMonth(firstDueDate),
    installments: schedule,
  };
};

export const calculateStatementPeriod = (
  dueDate: Date,
  dueDay: number,
  closingOffsetDays: number,
) => {
  const periodEnd = subDays(dueDate, closingOffsetDays);
  const previousDueDate = resolveDueDate(addMonths(dueDate, -1), dueDay);
  const previousClosing = subDays(previousDueDate, closingOffsetDays);
  const periodStart = addDays(previousClosing, 1);

  return {
    periodStart,
    periodEnd,
  };
};

export const formatISODate = (date: Date) => toISODate(date);
