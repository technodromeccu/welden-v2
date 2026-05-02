import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn("flex h-11 w-full rounded-xl border-0 border-b-2 border-transparent bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none ring-0 placeholder:text-slate-400 focus:border-primary", className)} {...props} />;
});
