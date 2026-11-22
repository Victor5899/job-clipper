import type { ReactNode, SelectHTMLAttributes } from "react";

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  options: readonly { value: string; label: string }[];
}

export function SelectField({
  id,
  label,
  error,
  hint,
  options,
  required,
  className = "",
  ...props
}: SelectFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-medium text-text">
        {label}
        {required && (
          <span className="ml-1 text-accent" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={[
          "h-10 w-full min-w-0 rounded-[10px] border bg-surface-1 px-3 text-sm text-text",
          "focus-visible:border-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          error ? "border-danger/80" : "border-border-strong",
        ].join(" ")}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
      {hint && <p className="text-[12.5px] text-text-muted">{hint}</p>}
    </div>
  );
}
