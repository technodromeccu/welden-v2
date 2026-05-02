export type LeadQualityFlag =
  | "placeholder_name"
  | "placeholder_email"
  | "disposable_email_domain"
  | "suspected_email_domain_typo"
  | "placeholder_phone"
  | "repeated_digit_phone"
  | "sequential_phone";

const COMMON_EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmial.com": "gmail.com",
  "gnail.com": "gmail.com",
  "hotnail.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "yaho.com": "yahoo.com",
  "yhoo.com": "yahoo.com"
};

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "temp-mail.org",
  "trashmail.com"
]);

const PLACEHOLDER_NAME_VALUES = new Set([
  "test",
  "tester",
  "asdf",
  "qwerty",
  "demo",
  "sample",
  "user",
  "unknown",
  "name",
  "na"
]);

const PLACEHOLDER_EMAIL_LOCALPARTS = new Set([
  "test",
  "testing",
  "demo",
  "sample",
  "hello",
  "mail",
  "email",
  "user",
  "admin"
]);

const PLACEHOLDER_PHONE_VALUES = new Set([
  "00000000",
  "0000000000",
  "00000000000",
  "11111111",
  "1111111111",
  "12345678",
  "1234567890",
  "9876543210"
]);

export interface LeadQualityAssessment {
  riskLevel: "clear" | "suspicious";
  flags: LeadQualityFlag[];
  warnings: string[];
  suggestedEmail?: string | null;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidPhone(value: string) {
  const digits = normalizePhoneDigits(value);
  return digits.length >= 8 && digits.length <= 15;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getEmailParts(value: string) {
  const normalized = normalizeEmail(value);
  const [local = "", domain = ""] = normalized.split("@");
  return { local, domain };
}

function isSequentialPhone(digits: string) {
  if (digits.length < 6) return false;
  const asc = "0123456789012345";
  const desc = "9876543210987654";
  for (let index = 0; index <= digits.length - 6; index += 1) {
    const chunk = digits.slice(index, index + 6);
    if (asc.includes(chunk) || desc.includes(chunk)) {
      return true;
    }
  }
  return false;
}

export function assessLeadQuality(input: { name?: string; email?: string; phone?: string }): LeadQualityAssessment {
  const flags: LeadQualityFlag[] = [];
  const warnings: string[] = [];
  const normalizedName = normalizeName(input.name ?? "");
  const normalizedEmail = normalizeEmail(input.email ?? "");
  const { local, domain } = getEmailParts(normalizedEmail);
  const phoneDigits = normalizePhoneDigits(input.phone ?? "");
  const suggestedEmail = COMMON_EMAIL_DOMAIN_TYPOS[domain] ? `${local}@${COMMON_EMAIL_DOMAIN_TYPOS[domain]}` : null;

  if (!normalizedName || normalizedName.length <= 2 || PLACEHOLDER_NAME_VALUES.has(normalizedName.replace(/\s+/g, ""))) {
    flags.push("placeholder_name");
    warnings.push("Name looks incomplete or placeholder-like.");
  }

  if (PLACEHOLDER_EMAIL_LOCALPARTS.has(local)) {
    flags.push("placeholder_email");
    warnings.push("Email looks generic. Double-check it before follow-up.");
  }

  if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    flags.push("disposable_email_domain");
    warnings.push("Email uses a temporary or disposable mailbox domain.");
  }

  if (suggestedEmail) {
    flags.push("suspected_email_domain_typo");
    warnings.push(`Email domain may be mistyped. Did you mean ${suggestedEmail}?`);
  }

  if (PLACEHOLDER_PHONE_VALUES.has(phoneDigits)) {
    flags.push("placeholder_phone");
    warnings.push("Phone number looks like a placeholder.");
  }

  if (/^(\d)\1{7,}$/.test(phoneDigits)) {
    flags.push("repeated_digit_phone");
    warnings.push("Phone number repeats the same digit too many times.");
  }

  if (isSequentialPhone(phoneDigits)) {
    flags.push("sequential_phone");
    warnings.push("Phone number looks sequential rather than real.");
  }

  return {
    riskLevel: flags.length ? "suspicious" : "clear",
    flags: Array.from(new Set(flags)),
    warnings: Array.from(new Set(warnings)),
    suggestedEmail
  };
}

/** Lightweight name-only check for use during the chatbot name-collection phase. */
export function isPlaceholderName(name: string): boolean {
  const normalized = name.trim().toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  return !normalized || normalized.length <= 2 || PLACEHOLDER_NAME_VALUES.has(normalized.replace(/\s+/g, ""));
}

export function splitLinesOrCsv(value: string) {
  return value.split(/\r?\n|,/).map((entry) => entry.trim()).filter(Boolean);
}

export function validateContactRequest(input: {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  machineInterest?: string;
  message?: string;
}) {
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  const message = input.message?.trim() ?? "";

  if (!name || !email || !phone || !message) {
    throw new Error("Name, email, phone, and requirement are required.");
  }

  if (name.length > 120) throw new Error("Name must be 120 characters or fewer.");
  if (email.length > 254) throw new Error("Email address is too long.");
  if (phone.length > 30) throw new Error("Phone number is too long.");
  if (message.length > 2000) throw new Error("Requirement must be 2000 characters or fewer.");
  if ((input.company?.trim() ?? "").length > 200) throw new Error("Company name is too long.");
  if ((input.machineInterest?.trim() ?? "").length > 300) throw new Error("Machine interest field is too long.");

  if (!isValidEmail(email)) {
    throw new Error("Please enter a valid email address.");
  }

  if (!isValidPhone(phone)) {
    throw new Error("Please enter a valid phone number.");
  }

  return {
    name,
    email,
    phone,
    company: input.company?.trim() ?? "",
    machineInterest: input.machineInterest?.trim() ?? "",
    message
  };
}

export function validateAdvisorRequest(input: {
  lead?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
  question?: string;
  transcriptSummary?: string;
}) {
  const lead = input.lead;
  const question = input.question?.trim() ?? "";

  if (!lead?.name?.trim() || !lead.email?.trim() || !lead.phone?.trim()) {
    throw new Error("Lead name, email, and phone are required.");
  }

  if (lead.name.trim().length > 120) throw new Error("Name must be 120 characters or fewer.");
  if (lead.email.trim().length > 254) throw new Error("Email address is too long.");
  if (lead.phone.trim().length > 30) throw new Error("Phone number is too long.");
  if ((lead.company?.trim() ?? "").length > 200) throw new Error("Company name is too long.");
  if (question.length > 2000) throw new Error("Question must be 2000 characters or fewer.");

  if (!isValidEmail(lead.email)) {
    throw new Error("Please enter a valid lead email address.");
  }

  if (!isValidPhone(lead.phone)) {
    throw new Error("Please enter a valid lead phone number.");
  }

  if (!question) {
    throw new Error("A question is required.");
  }

  return {
    lead: {
      name: lead.name.trim(),
      email: lead.email.trim(),
      phone: lead.phone.trim(),
      company: lead.company?.trim() ?? ""
    },
    question,
    transcriptSummary: input.transcriptSummary?.trim() ?? ""
  };
}