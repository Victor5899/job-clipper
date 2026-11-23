import type { InputHTMLAttributes, ReactNode } from "react";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Visually marks an optional field; required fields get an asterisk instead. */
  optional?: boolean;
}

export function TextField({
  id,
  label,
  hint,
  error,
  optional,
  required,
  className = "",
  ...inputProps
}: TextFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="flex items-baseline gap-1.5 text-[13px] font-medium text-text">
        {label}
        {required && (
          <span className="text-accent" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="micro-label text-text-subtle">Optional</span>}
      </label>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[
          "h-10 w-full min-w-0 rounded-[10px] border bg-surface-1 px-3 text-sm text-text",
          "placeholder:text-text-subtle transition-colors duration-150",
          "hover:border-text-subtle/50 focus-visible:border-accent/70 focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-accent/40",
          error ? "border-danger/80" : "border-border-strong",
        ].join(" ")}
        {...inputProps}
      />
      {error && (
        <p id={errorId} role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-[12.5px] text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
