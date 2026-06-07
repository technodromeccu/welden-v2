import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-[linear-gradient(135deg,#00346c,#1a4b8c)] text-white hover:brightness-110",
  secondary: "bg-surface-container-highest text-on-surface hover:bg-surface-variant",
  outline: "bg-surface-container-lowest text-on-surface hover:bg-surface-container-low",
  ghost: "text-primary hover:bg-surface-container-low"
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
