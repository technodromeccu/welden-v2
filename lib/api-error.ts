import { NextResponse } from "next/server";

// CODE-06: Standardised error response helper.
// 4xx errors expose the specific message (these come from deliberate business-logic throws).
// 5xx errors always return the fallback to avoid leaking filesystem paths, stack traces, etc.
// FEAT-09: 5xx errors are automatically logged via logError so every route gets structured output.
export function apiError(
  error: unknown,
  fallback: string,
  status = 400,
  context?: { route?: string; method?: string }
): NextResponse {
  const message = status >= 500
    ? fallback
    : (error instanceof Error ? error.message : fallback);
  if (status >= 500) {
    logError(error, { route: context?.route ?? "unknown", method: context?.method });
  }
  return NextResponse.json({ error: message }, { status });
}

// FEAT-09: Structured server-side error logger.
// Writes to stderr with route + method context so errors are easy to grep in logs.
// Never throws — safe to call from any catch block.
export function logError(
  error: unknown,
  context: { route: string; method?: string; detail?: string }
) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const parts = [
    `[ERROR] ${context.method ?? "UNKNOWN"} ${context.route}`,
    context.detail ? `  detail: ${context.detail}` : null,
    `  message: ${message}`,
    stack ? `  stack: ${stack.split("\n").slice(1, 4).join(" | ")}` : null
  ].filter(Boolean);
  console.error(parts.join("\n"));
}
