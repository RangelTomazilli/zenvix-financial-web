import { clsx } from "clsx";

interface TextFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = ({
  label,
  id,
  error,
  className,
  ...props
}: TextFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </label>
    <input
      id={id}
      className={clsx(
        "rounded-xl border border-slate-200/80 bg-white/90 px-3.5 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-lg shadow-slate-200/40 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200/60",
        error && "border-red-400 focus:border-red-500 focus:ring-red-200/80",
        className,
      )}
      {...props}
    />
    {error ? <p className="text-xs text-red-600">{error}</p> : null}
  </div>
);
