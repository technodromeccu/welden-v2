// CODE-02: Zod validation schemas for API routes.
// All public-facing and auth routes go through these — they're the trust boundary.
// Admin-internal routes (e.g. settings) retain their existing validateSettings() helpers
// since those already do thorough domain-specific checks.

import { z } from "zod";

// ── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .max(254, "Email address is too long.")
    .email("Please enter a valid email address.")
    .transform((val) => val.trim().toLowerCase()),
  password: z
    .string()
    .min(1, "Password is required.")
    .max(256, "Password is too long.")
});

export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .max(254, "Email address is too long.")
    .email("Please enter a valid email address.")
    .transform((val) => val.trim().toLowerCase())
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required.").max(256),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long.")
});

// ── Users ─────────────────────────────────────────────────────────────────────

const RoleEnum = z.enum(["admin", "manager", "agent"]);
const NotificationPrefEnum = z.enum(["all", "assigned_only"]);

export const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required.").max(120, "Name must be 120 characters or fewer.").transform((v) => v.trim()),
  email: z
    .string().min(1, "Email is required.").max(254, "Email address is too long.")
    .email("Please enter a valid email address.")
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long."),
  role: RoleEnum,
  active: z.boolean().optional().default(true),
  notificationPreference: NotificationPrefEnum.optional().default("all")
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(120).transform((v) => v.trim()).optional(),
  email: z
    .string().min(1).max(254).email("Please enter a valid email address.")
    .transform((v) => v.trim().toLowerCase())
    .optional(),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128).optional(),
  role: RoleEnum.optional(),
  active: z.boolean().optional(),
  notificationPreference: NotificationPrefEnum.optional()
});

// ── Advisor ───────────────────────────────────────────────────────────────────

const LeadSchema = z.object({
  name: z.string().min(1, "Lead name is required.").max(120).transform((v) => v.trim()),
  email: z.string().min(1).max(254).email("Please enter a valid lead email address.").transform((v) => v.trim()),
  phone: z.string().min(1).max(30, "Phone number is too long."),
  company: z.string().max(200).optional().transform((v) => v?.trim() ?? "")
});

export const AdvisorRequestSchema = z.object({
  lead: LeadSchema,
  question: z.string().min(1, "A question is required.").max(2000, "Question must be 2000 characters or fewer.").transform((v) => v.trim()),
  transcriptSummary: z.string().max(8000).optional().transform((v) => v?.trim() ?? "")
});

// ── Contact lead ──────────────────────────────────────────────────────────────

export const ContactLeadSchema = z.object({
  name: z.string().min(1, "Name is required.").max(120).transform((v) => v.trim()),
  email: z.string().min(1).max(254).email("Please enter a valid email address.").transform((v) => v.trim()),
  phone: z.string().min(1, "Phone is required.").max(30),
  company: z.string().max(200).optional().transform((v) => v?.trim() ?? ""),
  machineInterest: z.string().max(300).optional().transform((v) => v?.trim() ?? ""),
  message: z.string().min(1, "Requirement is required.").max(2000, "Requirement must be 2000 characters or fewer.").transform((v) => v.trim())
});

// Helper: parse with Zod and return a structured result
export function parseSchema<T>(schema: z.ZodType<T>, input: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(input);
  if (!result.success) {
    // Return first error message
    const first = result.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid input." };
  }
  return { ok: true, data: result.data };
}
