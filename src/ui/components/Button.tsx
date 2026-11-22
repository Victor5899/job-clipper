import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "light" | "ghost" | "quiet";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent-hover shadow-[0_0_32px_-8px_rgb(198_241_53/0.55)]",
  light: "bg-text text-bg hover:bg-white",
  ghost: "border border-border-strong text-text hover:border-text-subtle hover:bg-surface-2/60",
  quiet: "text-text-muted hover:text-text hover:bg-surface-2/70",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className = "",
}: { variant?: Variant; size?: Size; className?: string } = {}): string {
  return [
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-medium",
    "transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  ].join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
