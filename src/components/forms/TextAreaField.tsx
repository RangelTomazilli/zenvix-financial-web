import { clsx } from "clsx";

interface TextAreaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextAreaField = ({
  label,
  id,
  error,
  className,
  ...props
}: TextAreaFieldProps) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={id} className="text-sm font-medium text-gray-700">
      {label}
    </label>
    <textarea
      id={id}
      className={clsx(
        "h-24 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200",
        error && "border-red-500 focus:border-red-500 focus:ring-red-100",
        className,
      )}
      {...props}
    />
    {error ? <p className="text-xs text-red-600">{error}</p> : null}
  </div>
);
