import assert from "node:assert/strict";
import { buildSessionToken, canAccessRole, createPasswordRecord, hashPassword } from "../lib/auth-core.ts";
import { mergePublicAdvisorMemorySummary } from "../lib/advisor-memory.ts";
// Note: deterministic product-detection helpers (detectConversationProduct, etc.) were
// removed when product matching moved to the Gemini intent router in lib/advisor.ts.
// Their tests were removed with them — the behavior is now model-driven, not a pure unit.
import { addMachineBlock, deriveLandingCardLayout, deriveMachinePageLayout, moveMachineBlock, removeMachineBlock } from "../lib/machine-builder.ts";
import { mergeProductWithDraft, normalizeProduct, normalizeProductDraftRecord, productToDraftPayload } from "../lib/products.ts";
import { consumeRateLimit } from "../lib/rate-limit-core.ts";
import { renderQuotationEmailHtml, renderQuotationEmailText } from "../lib/quotation-email.ts";
import { assessLeadQuality, validateAdvisorRequest, validateContactRequest } from "../lib/request-validation.ts";
import { generatePreliminaryQuotationReference, issuePreliminaryQuotation, renderPreliminaryQuotation, renderPreliminaryQuotationVariants } from "../lib/quotations.ts";
import { decryptSecretsBundleForTesting, encryptSecretsBundleForTesting, getNextBackupRunsUtcForTesting } from "../lib/backup.ts";
import { getDeploymentHealth } from "../lib/runtime-config.ts";
import { validateSettings } from "../lib/settings.ts";
import { buildLeadPendingAssistantPrompt, getVisibleLeadSessionsForUser, summarizeLeadAssistantMemory } from "../lib/lead-assistant-core.ts";
import { readCollection, writeCollection } from "../lib/store.ts";
import type { AdvisorSession, User } from "../lib/types.ts";

type Case = {
  name: string;
  run: () => void | Promise<void>;
};

const baseUser: User = {
  id: "user_admin",
  name: "Admin User",
  email: "admin@welden.example",
  role: "admin",
  active: true,
  notificationPreference: "assigned_only"
};

const cases: Case[] = [
  {
    name: "deriveLandingCardLayout keeps authored block order and allows removed blocks",
    run: () => {
      const layout = deriveLandingCardLayout([
        { id: "landing_card:title", surface: "landing_card", type: "title" },
        { id: "landing_card:summary", surface: "landing_card", type: "summary" },
        { id: "landing_card:primaryCta", surface: "landing_card", type: "primaryCta" }
      ]);

      assert.deepEqual(layout.map((block) => block.type), ["title", "summary", "primaryCta"]);
      assert.deepEqual(
        addMachineBlock(layout, "landing_card", "cardMedia").map((block) => block.type),
        ["title", "summary", "primaryCta", "cardMedia"]
      );
    }
  },
  {
    name: "deriveMachinePageLayout maps legacy section order when no builder layout exists",
    run: () => {
      const layout = deriveMachinePageLayout([], ["overview", "media", "consultation"]);

      assert.deepEqual(layout.slice(0, 5).map((block) => block.type), [
        "hero",
        "overview",
        "quickSpecs",
        "gallery",
        "resourcePanel"
      ]);
      assert.equal(layout.some((block) => block.type === "consultation"), true);
      assert.equal(layout.some((block) => block.type === "relatedMachines"), true);
    }
  },
  {
    name: "machine builder helpers reorder and remove blocks predictably",
    run: () => {
      const starting = deriveMachinePageLayout([
        { id: "machine_page:hero", surface: "machine_page", type: "hero" },
        { id: "machine_page:overview", surface: "machine_page", type: "overview" },
        { id: "machine_page:faq", surface: "machine_page", type: "faq" }
      ]);

      const moved = moveMachineBlock(starting, "machine_page:faq", "machine_page:overview");
      assert.deepEqual(moved.map((block) => block.type), ["hero", "faq", "overview"]);

      const removed = removeMachineBlock(moved, "machine_page:faq");
      assert.deepEqual(removed.map((block) => block.type), ["hero", "overview"]);
    }
  },
  {
    name: "mergePublicAdvisorMemorySummary keeps the latest grounded memory lines",
    run: () => {
      const merged = mergePublicAdvisorMemorySummary(
        "Machine in discussion: Automatic Pipe Cutting Machine.\nLatest visitor request: Need pipe cutting details.",
        "Latest outcome: Shared grounded machine details.\nLatest visitor request: Please send pricing."
      );

      assert.equal(merged.includes("Machine in discussion: Automatic Pipe Cutting Machine."), true);
      assert.equal(merged.includes("Latest visitor request: Please send pricing."), true);
      assert.equal(merged.includes("Latest outcome: Shared grounded machine details."), true);
    }
  },
  {
    name: "normalizeProduct backfills missing array fields for admin editing",
    run: () => {
      const normalized = normalizeProduct({
        id: "prod_legacy",
        title: "Legacy Machine",
        slug: "legacy-machine",
        category: "Legacy",
        summary: "Old record",
        capabilities: undefined as unknown as string[],
        idealUseCases: undefined as unknown as string[],
        industries: undefined as unknown as string[],
        media: undefined as unknown as string[],
        brochureUrl: "",
        published: true,
        accent: "#000"
      });

      assert.deepEqual(normalized.media, []);
      assert.deepEqual(normalized.capabilities, []);
      assert.deepEqual(normalized.idealUseCases, []);
      assert.deepEqual(normalized.industries, []);
      assert.deepEqual(normalized.heroPoints, []);
      assert.deepEqual(normalized.specs, []);
      assert.deepEqual(normalized.howItWorks, []);
      assert.deepEqual(normalized.faqs, []);
      assert.deepEqual(normalized.machinePageSectionOrder, []);
      assert.equal(normalized.heroImagePosition, "center center");
    }
  },
  {
    name: "mergeProductWithDraft overlays a persisted machine draft for preview",
    run: () => {
      const published = normalizeProduct({
        id: "prod_pipe_cutting",
        title: "Automatic Pipe Cutting Machine",
        slug: "pipe-cutting-machine",
        category: "Pipe Cutting",
        summary: "Published summary",
        capabilities: ["Auto loading"],
        idealUseCases: ["Pipe production"],
        industries: ["Steel"],
        media: ["/published-1.jpg"],
        brochureUrl: "/published.pdf",
        published: true,
        accent: "#204b8f"
      });

      const merged = mergeProductWithDraft(published, {
        productId: published.id,
        updatedAt: "2026-04-22T12:00:00.000Z",
        updatedByUserId: "user_admin",
        publishedSnapshotHash: "hash",
        draft: {
          ...productToDraftPayload(published),
          title: "Automatic Pipe Cutting Machine Mk II",
          summary: "Draft summary",
          heroPoints: ["Higher throughput"]
        }
      });

      assert.equal(merged.title, "Automatic Pipe Cutting Machine Mk II");
      assert.equal(merged.summary, "Draft summary");
      assert.deepEqual(merged.heroPoints, ["Higher throughput"]);
      assert.equal(published.title, "Automatic Pipe Cutting Machine");
      assert.equal(published.summary, "Published summary");
    }
  },
  {
    name: "normalizeProductDraftRecord backfills malformed draft records safely",
    run: () => {
      const record = normalizeProductDraftRecord({
        productId: "prod_bearing",
        updatedByUserId: "user_admin",
        updatedAt: "2026-04-22T12:00:00.000Z",
        publishedSnapshotHash: 123 as unknown as string,
        draft: {
          title: "Bearing Pushing Machine Rev A",
          summary: "Draft bearing machine",
          media: undefined as unknown as string[],
          specs: undefined as unknown as Array<{ label: string; value: string }>
        } as unknown as ReturnType<typeof productToDraftPayload>
      });

      assert.equal(record?.productId, "prod_bearing");
      assert.equal(record?.updatedByUserId, "user_admin");
      assert.equal(record?.draft.title, "Bearing Pushing Machine Rev A");
      assert.equal(record?.draft.summary, "Draft bearing machine");
      assert.deepEqual(record?.draft.media, []);
      assert.deepEqual(record?.draft.specs, []);
      assert.equal(record?.publishedSnapshotHash, null);
    }
  },
  {
    name: "consumeRateLimit blocks after the configured request budget",
    run: () => {
      const scope = `test-${Date.now()}`;
      const policy = { maxRequests: 2, windowMs: 60_000 };

      const first = consumeRateLimit(scope, "127.0.0.1", policy, 1_000);
      const second = consumeRateLimit(scope, "127.0.0.1", policy, 1_001);
      const third = consumeRateLimit(scope, "127.0.0.1", policy, 1_002);

      assert.equal(first.allowed, true);
      assert.equal(second.allowed, true);
      assert.equal(third.allowed, false);
      assert.equal(third.remaining, 0);
    }
  },
  {
    name: "backup schedule resolves to 2pm and 7pm India time",
    run: () => {
      const runs = getNextBackupRunsUtcForTesting(new Date("2026-03-28T08:00:00.000Z"));
      assert.deepEqual(runs, ["2026-03-28T08:30:00.000Z", "2026-03-28T13:30:00.000Z"]);
    }
  },
  {
    name: "backup secrets bundle round-trips through encryption",
    run: () => {
      const encrypted = encryptSecretsBundleForTesting({ AUTH_SECRET: "secret", CRON_SECRET: "cron" }, "backup-key");
      const decrypted = decryptSecretsBundleForTesting(encrypted, "backup-key");

      assert.equal(decrypted.secrets.AUTH_SECRET, "secret");
      assert.equal(decrypted.secrets.CRON_SECRET, "cron");
    }
  },
  {
    name: "validateSettings normalizes emails and default timings",
    run: () => {
      const settings = validateSettings({
        advisorDefaultAssigneeId: "user_agent",
        businessDays: [5, 1, 3],
        businessHours: { start: 9, end: 18 },
        internalNotificationEmails: [" SALES@welden.example ", "sales@welden.example", "service@welden.example"],
        slaEscalationEmails: ["manager@welden.example", "MANAGER@welden.example"]
      });

      assert.deepEqual(settings.businessDays, [1, 3, 5]);
      assert.deepEqual(settings.internalNotificationEmails, ["sales@welden.example", "service@welden.example"]);
      assert.deepEqual(settings.slaEscalationEmails, ["manager@welden.example"]);
      assert.equal(settings.firstResponseSlaWorkingDays, 2);
      assert.equal(settings.slaReminderLeadHours, 4);
      assert.equal(settings.slaEscalationLeadHours, 24);
      assert.equal(settings.quotationLogoUrl, "");
      assert.equal(settings.quotationBrandName, "");
    }
  },
  {
    name: "validateSettings rejects invalid business hours",
    run: () => {
      assert.throws(() => validateSettings({
        advisorDefaultAssigneeId: "user_agent",
        businessDays: [1, 2, 3, 4, 5],
        businessHours: { start: 18, end: 9 },
        internalNotificationEmails: ["ops@welden.example"]
      }), /Business hours/);
    }
  },
  {
    name: "validateContactRequest trims and returns normalized values",
    run: () => {
      const result = validateContactRequest({
        name: "  Priya  ",
        email: "  priya@example.com ",
        phone: " +91 98765 43210 ",
        company: "  Welden Buyer  ",
        machineInterest: "  Pipe Cutting  ",
        message: "  Need a quote.  "
      });

      assert.equal(result.name, "Priya");
      assert.equal(result.email, "priya@example.com");
      assert.equal(result.machineInterest, "Pipe Cutting");
      assert.equal(result.message, "Need a quote.");
    }
  },
  {
    name: "validateContactRequest rejects bad email",
    run: () => {
      assert.throws(() => validateContactRequest({
        name: "Priya",
        email: "not-an-email",
        phone: "+919876543210",
        message: "Need help"
      }), /valid email/);
    }
  },
  {
    name: "validateAdvisorRequest rejects missing question",
    run: () => {
      assert.throws(() => validateAdvisorRequest({
        lead: { name: "Priya", email: "priya@example.com", phone: "+919876543210" },
        question: "   "
      }), /question is required/i);
    }
  },
  {
    name: "validateAdvisorRequest trims lead data",
    run: () => {
      const result = validateAdvisorRequest({
        lead: { name: "  Priya  ", email: " priya@example.com ", phone: " +919876543210 ", company: "  Buyer Co  " },
        question: "  Do you support bearing pushing?  ",
        transcriptSummary: "  Prior chat  "
      });

      assert.equal(result.lead.name, "Priya");
      assert.equal(result.lead.company, "Buyer Co");
      assert.equal(result.question, "Do you support bearing pushing?");
      assert.equal(result.transcriptSummary, "Prior chat");
    }
  },
  {
    name: "assessLeadQuality flags disposable emails and placeholder phones",
    run: () => {
      const quality = assessLeadQuality({
        name: "Test",
        email: "test@mailinator.com",
        phone: "1234567890"
      });

      assert.equal(quality.riskLevel, "suspicious");
      assert.equal(quality.flags.includes("disposable_email_domain"), true);
      assert.equal(quality.flags.includes("placeholder_phone"), true);
    }
  },
  {
    name: "assessLeadQuality suggests common email typo corrections",
    run: () => {
      const quality = assessLeadQuality({
        name: "Aman",
        email: "aman@gmai.com",
        phone: "+919812345678"
      });

      assert.equal(quality.suggestedEmail, "aman@gmail.com");
      assert.equal(quality.flags.includes("suspected_email_domain_typo"), true);
    }
  },
  {
    name: "buildLeadPendingAssistantPrompt prompts for missing phone call outcome",
    run: () => {
      const session: AdvisorSession = {
        id: "advisor_1",
        lead: { name: "Priya", email: "priya@example.com", phone: "+919999999999" },
        answers: { machineProblem: "Pipe cutting", materialType: "", throughput: "", bottleneck: "", automationLevel: "", precisionNeed: "", urgency: "" },
        recommendation: { recommendedProductId: null, recommendedCategory: "Pipe Cutting", confidence: "medium", explanation: "Pipe cutting lead", highlights: [] },
        escalated: false,
        createdAt: "2026-04-10T10:00:00.000Z",
        workflow: {
          stage: "contacted",
          ownerUserId: "user_agent",
          nextFollowUpAt: "2026-04-11T10:00:00.000Z",
          followUpStatus: "scheduled",
          quoteIssued: false,
          quotationReference: null,
          quotationStatus: null,
          quotationSnapshot: null,
          quotationPrice: null,
          quotationCurrency: null,
          quotationTitle: null,
          quotedAt: null,
          quotedMachineName: null,
          quotedVariantLabel: null,
          lastReminderSentAt: null,
          lastContactedAt: "2026-04-10T12:00:00.000Z",
          lastUpdatedAt: "2026-04-10T12:00:00.000Z",
          notes: [],
          activity: [],
          closeReason: null,
          closeReasonNote: null
        }
      };

      const prompt = buildLeadPendingAssistantPrompt(session, session.workflow);
      assert.equal(prompt?.includes("What was the outcome of the phone call"), true);
    }
  },
  {
    name: "summarizeLeadAssistantMemory includes last outcome and next action",
    run: () => {
      const summary = summarizeLeadAssistantMemory({
        stage: "qualified",
        notes: [],
        activity: [],
        lastCallOutcome: "send_brochure",
        lastCallSummary: "Buyer requested a machine brochure and sizing sheet.",
        nextSuggestedAction: "send_brochure"
      });

      assert.equal(summary?.includes("Last call outcome: send brochure."), true);
      assert.equal(summary?.includes("Buyer requested a machine brochure"), true);
      assert.equal(summary?.includes("Next action: Send brochure."), true);
    }
  },
  {
    name: "getVisibleLeadSessionsForUser keeps agents scoped to owned or unassigned leads",
    run: () => {
      const agent: User = { ...baseUser, id: "user_agent", role: "agent" };
      const sessions = [
        { id: "lead_1", lead: { name: "Owned", email: "owned@example.com", phone: "+91 90000 00001" }, answers: { machineProblem: "A", materialType: "", throughput: "", bottleneck: "", automationLevel: "", precisionNeed: "", urgency: "" }, recommendation: { recommendedProductId: null, recommendedCategory: "A", confidence: "medium", explanation: "A", highlights: [] }, escalated: false, createdAt: "2026-04-10T10:00:00.000Z", workflow: { stage: "new", ownerUserId: "user_agent", notes: [], activity: [] } },
        { id: "lead_2", lead: { name: "Unassigned", email: "open@example.com", phone: "+91 90000 00002" }, answers: { machineProblem: "B", materialType: "", throughput: "", bottleneck: "", automationLevel: "", precisionNeed: "", urgency: "" }, recommendation: { recommendedProductId: null, recommendedCategory: "B", confidence: "medium", explanation: "B", highlights: [] }, escalated: false, createdAt: "2026-04-10T10:00:00.000Z", workflow: { stage: "new", ownerUserId: null, notes: [], activity: [] } },
        { id: "lead_3", lead: { name: "Other", email: "other@example.com", phone: "+91 90000 00003" }, answers: { machineProblem: "C", materialType: "", throughput: "", bottleneck: "", automationLevel: "", precisionNeed: "", urgency: "" }, recommendation: { recommendedProductId: null, recommendedCategory: "C", confidence: "medium", explanation: "C", highlights: [] }, escalated: false, createdAt: "2026-04-10T10:00:00.000Z", workflow: { stage: "new", ownerUserId: "user_other", notes: [], activity: [] } }
      ] satisfies AdvisorSession[];

      const visible = getVisibleLeadSessionsForUser(agent, sessions);
      assert.deepEqual(visible.map((session) => session.id), ["lead_1", "lead_2"]);
    }
  },
  {
    name: "generatePreliminaryQuotationReference uses Welden preliminary quotation format",
    run: () => {
      const reference = generatePreliminaryQuotationReference(4, new Date("2026-03-26T00:00:00.000Z"));
      assert.equal(reference, "WEL-PQ-2026-0005");
    }
  },
  {
    name: "generatePreliminaryQuotationReference supports higher persisted counters",
    run: () => {
      const reference = generatePreliminaryQuotationReference(11, new Date("2026-03-26T00:00:00.000Z"));
      assert.equal(reference, "WEL-PQ-2026-0012");
    }
  },
  {
    name: "issuePreliminaryQuotation persists unique sequential references",
    run: async () => {
      const originalQuotations = await readCollection("preliminary-quotations");
      const originalSettings = await readCollection("settings");

      try {
        await writeCollection("preliminary-quotations", []);
        await writeCollection("settings", { ...originalSettings, lastQuotationNumber: 0 });

        const template = {
          id: "qtpl_pipe",
          title: "Pipe cutting preliminary quotation",
          productId: "prod_pipe_cutting",
          productSlug: "pipe-cutting-machine",
          machineName: "Automatic Pipe Cutting Machine",
          variantLabel: null,
          active: true,
          currency: "INR",
          basePrice: "12,50,000",
          intro: "Please find the preliminary quotation summary below.",
          scopeItems: ["Pipe cutting machine"],
          technicalSpecifications: [],
          generalNotes: [],
          bankDetails: [],
          exclusions: ["GST"],
          deliveryNote: "Delivery in 8-10 weeks.",
          installationNote: "Installation extra if required.",
          warrantyNote: "Warranty as per final offer.",
          paymentTerms: "50% advance.",
          validityNote: "Subject to technical and commercial confirmation.",
          termsAndConditions: ["Preliminary quotation only."],
          footerNote: "Reply on the same thread to continue.",
          sampleDocumentUrl: "",
          companyName: "Welden Industries",
          companyAddress: "Works address",
          companyPhone: "+91 1234567890",
          companyWebsite: "www.welden.in",
          createdAt: "2026-03-26T00:00:00.000Z",
          updatedAt: "2026-03-26T00:00:00.000Z"
        };
        const requester = { name: "Amit", email: "amit@example.com", phone: "+919812345678", company: "Buyer Co" };

        const first = await issuePreliminaryQuotation({
          template,
          requester,
          productTitle: "Automatic Pipe Cutting Machine"
        });
        const second = await issuePreliminaryQuotation({
          template,
          requester,
          productTitle: "Automatic Pipe Cutting Machine"
        });

        assert.equal(first.referenceNumber, "WEL-PQ-2026-0001");
        assert.equal(second.referenceNumber, "WEL-PQ-2026-0002");
      } finally {
        await writeCollection("preliminary-quotations", originalQuotations);
        await writeCollection("settings", originalSettings);
      }
    }
  },
  {
    name: "renderPreliminaryQuotation includes requester name and disclaimer",
    run: () => {
      const body = renderPreliminaryQuotation({
        referenceNumber: "WEL-PQ-2026-0001",
        productTitle: "Automatic Pipe Cutting Machine",
        requester: { name: "Amit", email: "amit@example.com", phone: "+919812345678", company: "Buyer Co" },
        template: {
          id: "qtpl_pipe",
          title: "Pipe cutting preliminary quotation",
          productId: "prod_pipe_cutting",
          productSlug: "pipe-cutting-machine",
          machineName: "Automatic Pipe Cutting Machine",
          variantLabel: null,
          active: true,
          currency: "INR",
          basePrice: "12,50,000",
          intro: "Please find the preliminary quotation summary below.",
          scopeItems: ["Pipe cutting machine"],
          exclusions: ["GST"],
          deliveryNote: "Delivery in 8-10 weeks.",
          installationNote: "Installation extra if required.",
          warrantyNote: "Warranty as per final offer.",
          paymentTerms: "50% advance.",
          validityNote: "Subject to technical and commercial confirmation.",
          termsAndConditions: ["Preliminary quotation only."],
          footerNote: "Reply on the same thread to continue.",
          sampleDocumentUrl: "",
          companyName: "Welden Industries",
          companyAddress: "Works address",
          companyPhone: "+91 1234567890",
          companyWebsite: "www.welden.in",
          createdAt: "2026-03-26T00:00:00.000Z",
          updatedAt: "2026-03-26T00:00:00.000Z"
        }
      });

      assert.equal(body.includes("Preliminary quotation"), true);
      assert.equal(body.includes("Issued to: Amit"), true);
      assert.equal(body.includes("www.welden.in"), true);
      assert.equal(body.includes("Subject to technical and commercial confirmation."), true);
    }
  },
  {
    name: "renderQuotationEmailHtml promotes quotation reference price and logo",
    run: () => {
      const quotation = {
        id: "pquote_1",
        referenceNumber: "WEL-PQ-2026-0007",
        templateId: "qtpl_pipe",
        templateTitle: "Pipe cutting preliminary quotation",
        templateVersionStamp: "qtpl_pipe:1",
        productId: "prod_pipe_cutting",
        productTitle: "Automatic Pipe Cutting Machine",
        requester: { name: "Amit", email: "amit@example.com", phone: "+919812345678", company: "Buyer Co" },
        advisorSessionId: "advisor_1",
        status: "issued",
        currency: "INR",
        basePrice: "12,50,000",
        quoteTitle: "Automatic Pipe Cutting Machine Preliminary quotation",
        quoteBody: "Plain quotation snapshot.",
        scopeItems: ["Pipe cutting machine", "Hydraulic clamping"],
        technicalSpecifications: ["Cut range 76 mm to 168.3 mm"],
        generalNotes: ["Civil work excluded"],
        bankDetails: ["ICICI Bank"],
        exclusions: ["GST"],
        termsAndConditions: ["Subject to confirmation"],
        validityNote: "Valid for 45 days.",
        validUntilDate: "2026-04-30T00:00:00.000Z",
        deliveryNote: "8 to 10 weeks",
        installationNote: "Installation extra if required",
        warrantyNote: "Warranty as per final offer",
        footerNote: "Reply on the same thread to continue.",
        paymentTerms: "50% advance",
        sampleDocumentUrl: "",
        createdAt: "2026-03-26T00:00:00.000Z",
        updatedAt: "2026-03-26T00:00:00.000Z",
        companyName: "Welden Industries",
        companyAddress: "Works address",
        companyPhone: "+91 1234567890",
        companyWebsite: "www.welden.in"
      } as const;

      const html = renderQuotationEmailHtml({
        quotation,
        variantLabel: "Manual loading version",
        branding: { logoUrl: "/images/branding/uploads/welden-logo.png", brandName: "Welden Industries" }
      });
      const text = renderQuotationEmailText({
        quotation,
        variantLabel: "Manual loading version",
        branding: { logoUrl: "/images/branding/uploads/welden-logo.png", brandName: "Welden Industries" }
      });

      assert.equal(html.includes("WEL-PQ-2026-0007"), true);
      assert.equal(html.includes("INR 12,50,000"), true);
      assert.equal(html.includes("Automatic Pipe Cutting Machine"), true);
      assert.equal(html.includes("/images/branding/uploads/welden-logo.png"), true);
      assert.equal(html.includes("Included scope"), true);
      assert.equal(text.includes("Price: INR 12,50,000"), true);
    }
  },
  {
    name: "renderPreliminaryQuotationVariants lists all variant prices",
    run: () => {
      const body = renderPreliminaryQuotationVariants({
        referenceNumber: "WEL-PQ-2026-0002",
        productTitle: "Automatic Conveyor Idler Welding Machine",
        requester: { name: "Amit", email: "amit@example.com", phone: "+919812345678", company: "Buyer Co" },
        templates: [
          {
            id: "qtpl_idler_manual",
            title: "Idler welding manual",
            productId: "prod_idler_welding",
            productSlug: "idler-welding-machine",
            machineName: "Twin Head Automatic Idler Welding Machine",
            variantLabel: "Manual",
            active: true,
            currency: "INR",
            basePrice: "6,15,000.00",
            intro: "Please find our variant-wise preliminary quotation below.",
            scopeItems: ["Manual loading and manual clamping"],
            exclusions: ["GST"],
            deliveryNote: "Delivery in 8 to 10 weeks.",
            installationNote: "Installation support available.",
            warrantyNote: "Warranty as per final offer.",
            paymentTerms: "40% advance.",
            validityNote: "Subject to technical and commercial confirmation.",
            termsAndConditions: ["Preliminary quotation only."],
            footerNote: "Reply on the same thread to confirm the required version.",
            sampleDocumentUrl: "",
            companyName: "Welden Industries",
            companyAddress: "Works address",
            companyPhone: "+91 1234567890",
            companyWebsite: "www.welden.in",
            createdAt: "2026-03-26T00:00:00.000Z",
            updatedAt: "2026-03-26T00:00:00.000Z"
          },
          {
            id: "qtpl_idler_mech",
            title: "Idler welding mechanized",
            productId: "prod_idler_welding",
            productSlug: "idler-welding-machine",
            machineName: "Twin Head Automatic Idler Welding Machine",
            variantLabel: "Mechanized",
            active: true,
            currency: "INR",
            basePrice: "12,38,000.00",
            intro: "Please find our variant-wise preliminary quotation below.",
            scopeItems: ["Mechanized loading and clamping"],
            exclusions: ["GST"],
            deliveryNote: "Delivery in 8 to 10 weeks.",
            installationNote: "Installation support available.",
            warrantyNote: "Warranty as per final offer.",
            paymentTerms: "40% advance.",
            validityNote: "Subject to technical and commercial confirmation.",
            termsAndConditions: ["Preliminary quotation only."],
            footerNote: "Reply on the same thread to confirm the required version.",
            sampleDocumentUrl: "",
            companyName: "Welden Industries",
            companyAddress: "Works address",
            companyPhone: "+91 1234567890",
            companyWebsite: "www.welden.in",
            createdAt: "2026-03-26T00:00:00.000Z",
            updatedAt: "2026-03-26T00:00:00.000Z"
          }
        ]
      });

      assert.equal(body.includes("Manual - INR 6,15,000.00 Ex. Works Kolkata"), true);
      assert.equal(body.includes("Mechanized - INR 12,38,000.00 Ex. Works Kolkata"), true);
      assert.equal(body.includes("confirm the required version"), true);
    }

  },

  {
    name: "createPasswordRecord creates a verifiable hash",
    run: () => {
      const password = "WeldenAdmin!2026";
      const record = createPasswordRecord(password);

      assert.equal(record.salt.length > 0, true);
      assert.equal(record.passwordHash, hashPassword(password, record.salt));
      assert.notEqual(record.passwordHash, hashPassword("WrongPassword!", record.salt));
    }
  },
  {
    name: "buildSessionToken creates signed payload token",
    run: () => {
      const token = buildSessionToken(baseUser);
      const parts = token.split(".");

      assert.equal(parts.length, 2);
      assert.equal(parts[0].length > 0, true);
      assert.equal(parts[1].length > 0, true);
    }
  },
  {
    name: "canAccessRole respects allowed role lists",
    run: () => {
      assert.equal(canAccessRole(baseUser, ["admin"]), true);
      assert.equal(canAccessRole(baseUser, ["manager", "agent"]), false);
    }
  },
  {
    name: "getDeploymentHealth reports degraded without required secrets",
    run: () => {
      const previous = {
        AUTH_SECRET: process.env.AUTH_SECRET,
        CRON_SECRET: process.env.CRON_SECRET,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        RESEND_SENDER_EMAIL: process.env.RESEND_SENDER_EMAIL
      };

      delete process.env.AUTH_SECRET;
      delete process.env.CRON_SECRET;
      delete process.env.GEMINI_API_KEY;
      delete process.env.RESEND_API_KEY;
      delete process.env.RESEND_SENDER_EMAIL;

      const result = getDeploymentHealth();
      assert.equal(result.authSecretConfigured, false);
      assert.equal(result.cronConfigured, false);
      assert.equal(result.geminiConfigured, false);
      assert.equal(result.resendConfigured, false);
      assert.equal(result.readyForProduction, false);

      Object.assign(process.env, previous);
    }
  },
  {
    name: "getDeploymentHealth reports ready when required secrets exist",
    run: () => {
      const previous = {
        AUTH_SECRET: process.env.AUTH_SECRET,
        CRON_SECRET: process.env.CRON_SECRET,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        RESEND_SENDER_EMAIL: process.env.RESEND_SENDER_EMAIL
      };

      process.env.AUTH_SECRET = "production-secret-value";
      process.env.CRON_SECRET = "cron-secret-value";
      process.env.GEMINI_API_KEY = "gemini-key";
      process.env.RESEND_API_KEY = "resend-key";
      process.env.RESEND_SENDER_EMAIL = "ops@welden.example";

      const result = getDeploymentHealth();
      assert.equal(result.authSecretConfigured, true);
      assert.equal(result.cronConfigured, true);
      assert.equal(result.geminiConfigured, true);
      assert.equal(result.resendConfigured, true);
      assert.equal(result.readyForProduction, true);

      Object.assign(process.env, previous);
    }
  }
];

let failed = 0;
for (const testCase of cases) {
  try {
    await testCase.run();
    console.log(`PASS ${testCase.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${testCase.name}`);
    console.error(error instanceof Error ? error.stack ?? error.message : error);
  }
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}

console.log(`\n${cases.length} test(s) passed.`);



