import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn("flex min-h-[120px] w-full rounded-2xl border-0 border-b-2 border-transparent bg-surface-container-high px-3 py-3 text-sm text-on-surface outline-none placeholder:text-slate-400 focus:border-primary", className)} {...props} />;
});
