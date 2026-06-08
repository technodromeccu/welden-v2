import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
};

// Phase 3 polish:
// - `default` + `destructive` gain a tactile micro-bevel via inset shadows (top
//   highlight + bottom shade) — looks pressable without changing the brand color.
// - `active:translate-y-px` gives a felt press response on click.
// - `destructive` is a new variant for delete / discard / irreversible actions —
//   uses brand-red, NOT slate / outline, so destructive intent is unambiguous.
// - The legacy `bg-[linear-gradient(...)]` on `default` stays — that's the brand
//   gradient; the bevel layers on top via shadow.
const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-[linear-gradient(135deg,#00346c,#1a4b8c)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(0,0,0,0.12)] hover:brightness-110 active:translate-y-px",
  secondary: "bg-surface-container-highest text-on-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] hover:bg-surface-variant active:translate-y-px",
  outline: "bg-surface-container-lowest text-on-surface hover:bg-surface-container-low active:translate-y-px",
  ghost: "text-primary hover:bg-surface-container-low",
  destructive: "bg-[linear-gradient(135deg,#b91c1c,#dc2626)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(0,0,0,0.14)] hover:brightness-110 active:translate-y-px"
};

// Strict 8pt grid: sm=32 / md=40 / lg=48. Matches Input height so buttons and
// inputs sit on the same baseline when placed in a row.
const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-8 px-3",
  lg: "h-12 px-6"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-xl text-sm font-semibold tracking-[0.01em] transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
