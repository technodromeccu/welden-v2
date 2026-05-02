export type Role = "admin" | "manager" | "agent";
export type LeadStage = "new" | "quoted" | "contact_scheduled" | "contacted" | "qualified" | "proposal_sent" | "won" | "lost";
export type PreliminaryQuotationStatus =
  | "issued"
  | "review_pending"
  | "follow_up_due"
  | "converted_to_formal_quote"
  | "closed";

export type MachineSurface = "landing_card" | "machine_page";
export type LandingCardBlockType = "cardMedia" | "categoryBadge" | "title" | "summary" | "usp" | "capabilityChips" | "primaryCta";
export type MachinePageBlockType = "hero" | "overview" | "quickSpecs" | "capabilities" | "useCases" | "industries" | "howItWorks" | "specTable" | "gallery" | "resourcePanel" | "faq" | "consultation" | "relatedMachines";

export type MachineBlock =
  | {
      id: string;
      surface: "landing_card";
      type: LandingCardBlockType;
      hidden?: boolean;
    }
  | {
      id: string;
      surface: "machine_page";
      type: MachinePageBlockType;
      hidden?: boolean;
    };

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  notificationPreference: "all" | "assigned_only";
}

export interface AuthAccount {
  userId: string;
  email: string;
  salt: string;
  passwordHash: string;
}

export interface Lead {
  name: string;
  email: string;
  phone: string;
  company?: string;
}

export type LeadQualityFlag =
  | "placeholder_name"
  | "placeholder_email"
  | "disposable_email_domain"
  | "suspected_email_domain_typo"
  | "placeholder_phone"
  | "repeated_digit_phone"
  | "sequential_phone";

export interface LeadQuality {
  riskLevel: "clear" | "suspicious";
  flags: LeadQualityFlag[];
  warnings: string[];
  suggestedEmail?: string | null;
}

export type LeadFollowUpStatus = "pending" | "scheduled" | "due" | "completed" | "no_answer" | "call_back_later";
export type LeadCallOutcome =
  | "no_answer"
  | "call_back_requested"
  | "send_brochure"
  | "send_quotation"
  | "needs_more_details"
  | "technical_discussion_needed"
  | "budget_not_clear"
  | "wrong_contact"
  | "not_interested"
  | "follow_up_later"
  | "meeting_scheduled"
  | "converted"
  | "lost";
export type LeadSuggestedAction =
  | "call_again"
  | "schedule_callback"
  | "send_brochure"
  | "prepare_quotation"
  | "collect_details"
  | "technical_review"
  | "qualify_budget"
  | "correct_contact"
  | "close_lost"
  | "schedule_follow_up"
  | "schedule_meeting"
  | "mark_won";

export type AssistantProposal =
  | {
      type: "open_lead";
      leadId: string;
      label: string;
      requiresConfirmation?: false;
    }
  | {
      type: "schedule_follow_up";
      leadId: string;
      label: string;
      note?: string | null;
      dueAt?: string | null;
      requiresConfirmation: true;
    }
  | {
      type: "suggest_stage_change";
      leadId: string;
      label: string;
      stage: LeadStage;
      note?: string | null;
      requiresConfirmation: true;
    }
  | {
      type: "draft_note";
      leadId: string;
      label: string;
      note: string;
      requiresConfirmation: true;
    };

export type LeadActivityType =
  | "chatbot_created"
  | "contact_request_created"
  | "quote_issued"
  | "follow_up_scheduled"
  | "callback_requested"
  | "call_logged"
  | "note_added"
  | "status_changed"
  | "owner_changed"
  | "reminder_sent"
  | "escalation_sent"
  | "stale_alert_sent"
  | "duplicate_merged"
  | "close_reason_set"
  | "email_delivery_failed"
  | "assistant_prompted"
  | "call_outcome_logged"
  | "brochure_requested"
  | "brochure_sent"
  | "details_requested"
  | "details_received";

export interface LeadNote {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorRole: Role;
}

export interface LeadActivity {
  id: string;
  type: LeadActivityType;
  body: string;
  createdAt: string;
  authorName: string;
  authorRole: Role | "system";
}

export interface LeadWorkflow {
  stage: LeadStage;
  ownerUserId?: string | null;
  nextFollowUpAt?: string | null;
  firstCallDueAt?: string | null;
  firstCallCompletedAt?: string | null;
  firstCallReminderSentAt?: string | null;
  firstCallEscalationSentAt?: string | null;
  staleAlertSentAt?: string | null;
  preferredCallbackAt?: string | null;
  preferredCallbackNote?: string | null;
  followUpStatus?: LeadFollowUpStatus | null;
  quoteIssued?: boolean;
  quotationReference?: string | null;
  quotationStatus?: PreliminaryQuotationStatus | null;
  quotationSnapshot?: string | null;
  quotationPrice?: string | null;
  quotationCurrency?: string | null;
  quotationTitle?: string | null;
  quotedAt?: string | null;
  quotedMachineName?: string | null;
  quotedVariantLabel?: string | null;
  lastCallAt?: string | null;
  lastCallByUserId?: string | null;
  lastCallOutcome?: LeadCallOutcome | null;
  lastCallSummary?: string | null;
  nextSuggestedAction?: LeadSuggestedAction | null;
  nextSuggestedActionDueAt?: string | null;
  pendingAssistantPrompt?: string | null;
  assistantMemory?: string | null;
  publicAdvisorMemory?: string | null;
  publicAdvisorMemoryUpdatedAt?: string | null;
  lastReminderSentAt?: string | null;
  lastContactedAt?: string | null;
  lastUpdatedAt?: string | null;
  notes: LeadNote[];
  activity: LeadActivity[];
  closeReason?: string | null;
  closeReasonNote?: string | null;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  capabilities: string[];
  idealUseCases: string[];
  industries: string[];
  media: string[];
  featuredImage?: string;
  heroImage?: string;
  videoUrl?: string;
  brochureUrl: string;
  published: boolean;
  accent: string;
  usp?: string;
  heroImagePosition?: string;
  shortName?: string;
  heroTitle?: string;
  heroPoints?: string[];
  detailedDescription?: string;
  landingCardLayout?: MachineBlock[];
  machinePageLayout?: MachineBlock[];
  machinePageSectionOrder?: string[];
  specs?: Array<{
    label: string;
    value: string;
  }>;
  howItWorks?: Array<{
    step: number;
    title: string;
    body: string;
  }>;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductDraftPayload {
  title: string;
  slug: string;
  category: string;
  summary: string;
  capabilities: string[];
  idealUseCases: string[];
  industries: string[];
  media: string[];
  featuredImage?: string;
  heroImage?: string;
  videoUrl?: string;
  brochureUrl: string;
  published: boolean;
  accent: string;
  usp?: string;
  heroImagePosition?: string;
  shortName?: string;
  heroTitle?: string;
  heroPoints?: string[];
  detailedDescription?: string;
  landingCardLayout?: MachineBlock[];
  machinePageLayout?: MachineBlock[];
  machinePageSectionOrder?: string[];
  specs?: Array<{
    label: string;
    value: string;
  }>;
  howItWorks?: Array<{
    step: number;
    title: string;
    body: string;
  }>;
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
}

export interface ProductDraftRecord {
  productId: string;
  draft: ProductDraftPayload;
  updatedAt: string;
  updatedByUserId: string;
  publishedSnapshotHash?: string | null;
}

export interface HeroSlide {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  eyebrow?: string;
  imagePosition?: string;
}

export interface SiteSection {
  key: string;
  title: string;
  eyebrow: string;
  body: string;
  items?: string[];
  mediaLabel?: string;
  imageUrl?: string;
  slides?: HeroSlide[];
  published?: boolean;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  sourceType: "pdf" | "text" | "video";
  summary: string;
  extractedText: string;
  active: boolean;
  updatedAt: string;
}

export interface AdvisorCitation {
  sourceType: "product" | "knowledge_document" | "site_section";
  sourceId: string;
  sourceTitle: string;
  snippet: string;
}

export type AiProvider = "gemini" | "fallback";
export type AiConfidence = "high" | "medium" | "low";

export interface AiResponseMetadata {
  provider: AiProvider;
  model?: string | null;
  confidence?: AiConfidence | null;
  humanHandoffRecommended?: boolean;
  groundedContextSummary?: string | null;
  fallbackReason?: string | null;
}

export interface AdvisorAnswerSet {
  machineProblem: string;
  materialType: string;
  throughput: string;
  bottleneck: string;
  automationLevel: string;
  precisionNeed: string;
  urgency: string;
}

export interface AdvisorRecommendation {
  recommendedProductId: string | null;
  recommendedCategory: string | null;
  confidence: "high" | "medium" | "needs_engineer_review";
  explanation: string;
  highlights: string[];
  citations?: AdvisorCitation[];
  escalationReason?: string;
}

export interface PublicAdvisorResponse {
  intent: "quote" | "human" | "custom_requirement" | "answer";
  answer: string;
  found: boolean;
  highlights: string[];
  citations: AdvisorCitation[];
  recommendedCategory: string | null;
  quotationReference?: string | null;
  quality: LeadQuality;
  sessionId?: string | null;
  ai?: AiResponseMetadata;
}

export interface InternalAssistantResponse {
  reply: string;
  actions?: AssistantProposal[];
  ai?: AiResponseMetadata;
}

export interface AdvisorSession {
  id: string;
  lead: Lead;
  quality?: LeadQuality;
  answers: AdvisorAnswerSet;
  recommendation: AdvisorRecommendation;
  escalated: boolean;
  createdAt: string;
  workflow?: LeadWorkflow;
  diagnostics?: {
    intent: "quote" | "human" | "custom_requirement" | "answer";
    found: boolean;
    quoteAsked?: boolean;
    preliminaryQuotationId?: string | null;
    preliminaryQuotationReference?: string | null;
    matchedProductId?: string | null;
    matchedCategory?: string | null;
  };
}

export interface QuotationTemplate {
  id: string;
  title: string;
  productId: string | null;
  productSlug?: string | null;
  machineName: string;
  variantLabel?: string | null;
  active: boolean;
  currency: string;
  basePrice: string;
  intro: string;
  scopeItems: string[];
  technicalSpecifications: string[];
  generalNotes: string[];
  bankDetails: string[];
  exclusions: string[];
  deliveryNote: string;
  installationNote: string;
  warrantyNote: string;
  paymentTerms: string;
  validityNote: string;
  // FEAT-06: number of calendar days from issuance until this quotation expires
  validityDays?: number | null;
  termsAndConditions: string[];
  footerNote: string;
  sampleDocumentUrl?: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyWebsite: string;
  createdAt: string;
  updatedAt: string;
}

export interface PreliminaryQuotation {
  id: string;
  referenceNumber: string;
  templateId: string;
  templateTitle: string;
  templateVersionStamp: string;
  productId: string | null;
  productTitle: string;
  requester: Lead;
  advisorSessionId?: string | null;
  status: PreliminaryQuotationStatus;
  currency: string;
  basePrice: string;
  quoteTitle: string;
  quoteBody: string;
  scopeItems: string[];
  technicalSpecifications: string[];
  generalNotes: string[];
  bankDetails: string[];
  exclusions: string[];
  termsAndConditions: string[];
  validityNote: string;
  paymentTerms: string;
  // FEAT-06: ISO date string computed from template.validityDays at issuance time
  validUntilDate?: string | null;
  deliveryNote: string;
  installationNote: string;
  warrantyNote: string;
  footerNote: string;
  sampleDocumentUrl?: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyWebsite: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  advisorDefaultAssigneeId: string;
  businessDays: number[];
  businessHours: {
    start: number;
    end: number;
  };
  internalNotificationEmails: string[];
  firstResponseSlaWorkingDays?: number;
  slaReminderLeadHours?: number;
  slaEscalationLeadHours?: number;
  slaEscalationEmails?: string[];
  staleLeadDays?: number;
  quotationLogoUrl?: string;
  quotationBrandName?: string;
  // CODE-05: monotonically-increasing counter so deleting quotations can't cause ref-number collisions
  lastQuotationNumber?: number;
}

export interface BackupManifestFile {
  path: string;
  size: number;
  sha256: string;
  encoding: "utf8" | "base64";
}

export interface BackupManifest {
  app: string;
  schemaVersion: number;
  createdAt: string;
  createdAtIst: string;
  gitCommitHash: string | null;
  files: BackupManifestFile[];
}

export interface BackupBundleFile {
  path: string;
  encoding: "utf8" | "base64";
  data: string;
}

export interface BackupBundle {
  version: number;
  manifest: BackupManifest;
  files: BackupBundleFile[];
}

export interface BackupSecretsBundle {
  version: number;
  createdAt: string;
  gitCommitHash: string | null;
  secrets: Record<string, string>;
}

export interface BackupArtifact {
  id: string;
  name: string;
  kind: "bundle" | "secrets";
  createdAt?: string;
  webViewLink?: string;
  size?: number;
}

export interface BackupStatus {
  configured: boolean;
  configurationError: string | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  latestSnapshotName: string | null;
  latestSecretsName: string | null;
  latestSnapshotId: string | null;
  latestSecretsId: string | null;
  lastError: string | null;
  nextScheduledRunsUtc: string[];
  retentionDays: number;
  dailyRetentionDays: number;
}

export interface DashboardWorkNextItem {
  id: string;
  name: string;
  email: string;
  category: string | null;
  attentionLabel: string;
  attentionTone: "warning" | "danger" | "success" | "secondary" | "outline";
}

export interface DeploymentHealth {
  authSecretConfigured: boolean;
  emailConfigured: boolean;
  resendConfigured: boolean;
  cronConfigured: boolean;
  geminiConfigured: boolean;
  readyForProduction: boolean;
}

export interface DashboardSummary {
  leadCount: number;
  quotedLeadCount: number;
  firstCallOpenCount: number;
  firstCallDueCount: number;
  quotedAwaitingCallCount: number;
  callbacksTodayCount: number;
  retryQueueCount: number;
  staleLeadCount: number;
  escalatedLeadCount: number;
  publishedProductsCount: number;
  liveSectionsCount: number;
  activeKnowledgeDocumentsCount: number;
  stageCounts: Array<{
    stage: LeadStage;
    count: number;
  }>;
  machineInterest: Array<{
    label: string;
    count: number;
  }>;
  workNext: DashboardWorkNextItem[];
}

export interface DashboardSnapshot {
  dashboardSummary: DashboardSummary | null;
  deploymentHealth?: DeploymentHealth | null;
  users: User[];
  products: Product[];
  productDrafts: ProductDraftRecord[];
  siteSections: SiteSection[];
  knowledgeDocuments: KnowledgeDocument[];
  advisorSessions: AdvisorSession[];
  /** Total count of sessions before pagination — used to show "Showing N of M" and drive the Load More button. */
  advisorSessionsTotal?: number;
  quotationTemplates: QuotationTemplate[];
  preliminaryQuotations: PreliminaryQuotation[];
  settings: Settings;
}
