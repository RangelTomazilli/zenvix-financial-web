'use client';

import { useFormStatus } from "react-dom";
import { clsx } from "clsx";

interface SubmitButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pendingLabel?: string;
}

export const SubmitButton = ({
  children,
  pendingLabel = "Salvando...",
  className,
  disabled,
  ...props
}: SubmitButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={clsx(
        "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-400/30 transition hover:from-indigo-500 hover:via-indigo-500 hover:to-sky-400 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      disabled={pending || disabled}
      {...props}
    >
      {pending ? pendingLabel : children}
    </button>
  );
};
