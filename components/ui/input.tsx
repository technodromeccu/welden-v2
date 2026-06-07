import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  // h-10 (40px) matches Button default — buttons and inputs share the same
  // baseline when placed in a row. Placeholder uses the admin's semantic token,
  // not slate-* (off-system).
  return <input ref={ref} className={cn("flex h-10 w-full rounded-xl border-0 border-b-2 border-transparent bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none ring-0 placeholder:text-secondary/60 focus:border-primary", className)} {...props} />;
});
