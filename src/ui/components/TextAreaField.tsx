import type { TextareaHTMLAttributes } from "react";

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
}

export function TextAreaField({
  id,
  label,
  error,
  optional,
  required,
  className = "",
  ...props
}: TextAreaFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="flex items-baseline gap-1.5 text-[13px] font-medium text-text">
        {label}
        {optional && <span className="micro-label text-text-subtle">Optional</span>}
      </label>
      <textarea
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={[
          "min-h-24 w-full min-w-0 rounded-[10px] border bg-surface-1 px-3 py-2 text-sm text-text",
          "placeholder:text-text-subtle focus-visible:border-accent/70 focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-accent/40",
          error ? "border-danger/80" : "border-border-strong",
        ].join(" ")}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-[12.5px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
