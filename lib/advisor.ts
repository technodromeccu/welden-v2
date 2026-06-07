import { attachQuotationToAdvisorSession, createLeadFromInquiry, getAdvisorSessions, updateAdvisorSessionPublicMemory } from "@/lib/leads";
import { sendQuotationEmail } from "@/lib/email";
import { generateGeminiJson } from "@/lib/gemini";
import { getActiveQuotationTemplatesForProduct, getQuotationTemplates, issuePreliminaryQuotation, issueVariantPreliminaryQuotation } from "@/lib/quotations";
import { assessLeadQuality } from "@/lib/request-validation";
import { readCollection } from "@/lib/store";
import { buildSiteSectionSourceText, buildSnippet, scoreBag, tokenize } from "@/lib/advisor-core";
import { mergePublicAdvisorMemorySummary } from "@/lib/advisor-memory";
import { getKbDocGeminiFile, pickFileBackedDocForGrounding } from "@/lib/kb-grounding";
import type { AdvisorIntent } from "@/lib/advisor-core";
import type { AdvisorCitation, AiConfidence, AiResponseMetadata, KnowledgeDocument, Lead, Product, PublicAdvisorResponse, SiteSection } from "@/lib/types";
import { writeCollection } from "./store";

type KnowledgeAnswer = {
  found: boolean;
  answer: string;
  highlights: string[];
  citations: AdvisorCitation[];
  recommendedProductId: string | null;
  recommendedCategory: string | null;
  matchedProduct: Product | null;
};

type AdvisorAiPayload = {
  answer?: string;
  confidence?: AiConfidence;
  humanHandoffRecommended?: boolean;
  groundedContextSummary?: string;
};

function answerFromKnowledgeBase(products: Product[], documents: KnowledgeDocument[], siteSections: SiteSection[], question: string, explicitlyMentionedProduct: Product | null): KnowledgeAnswer {
  const queryTerms = tokenize(question);
  const productMatches = products
    .filter((product) => product.published && product.title.trim())
    .map((product) => {
      const sourceText = [
        product.title,
        product.category,
        product.summary,
        product.detailedDescription ?? "",
        ...(product.capabilities ?? []),
        ...(product.idealUseCases ?? []),
        ...(product.industries ?? []),
        ...(product.heroPoints ?? []),
        ...(product.specs ?? []).map((spec) => `${spec.label}: ${spec.value}`)
      ].join(" ");

      const aliasBoost = explicitlyMentionedProduct?.id === product.id ? 10 : 0;

      return {
        product,
        sourceText,
        score: scoreBag(sourceText, queryTerms) + aliasBoost
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const sectionMatches = siteSections
    .filter((section) => section.published !== false)
    .map((section) => {
      const sourceText = buildSiteSectionSourceText(section);
      const baseScore = scoreBag(sourceText, queryTerms);
      const preferredBoost = ["hero", "about", "machines", "contact", "advisor"].includes(section.key) ? 1 : 0;
      return {
        section,
        sourceText,
        score: baseScore + preferredBoost
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const documentMatches = documents
    .filter((document) => document.active)
    .map((document) => {
      const sourceText = `${document.title}. ${document.summary}. ${document.extractedText}`;
      return {
        document,
        sourceText,
        score: scoreBag(sourceText, queryTerms)
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!productMatches.length && !documentMatches.length && !sectionMatches.length) {
    return {
      found: false,
      answer:
        "I can only answer from approved Welden website content and knowledge documents. I do not have grounded information for that yet. If you want, I can log this for a quotation or human follow-up from Welden.",
      highlights: [],
      citations: [],
      recommendedProductId: null,
      recommendedCategory: null,
      matchedProduct: null
    };
  }

  const citations: AdvisorCitation[] = [];
  const topProduct = explicitlyMentionedProduct ?? productMatches[0]?.product ?? null;
  const topProductMatch = topProduct ? productMatches.find((entry) => entry.product.id === topProduct.id) ?? null : null;

  if (topProductMatch) {
    citations.push({
      sourceType: "product",
      sourceId: topProductMatch.product.id,
      sourceTitle: topProductMatch.product.title,
      snippet: buildSnippet(topProductMatch.sourceText, queryTerms)
    });
  }

  if (sectionMatches[0]) {
    citations.push({
      sourceType: "site_section",
      sourceId: sectionMatches[0].section.key,
      sourceTitle: sectionMatches[0].section.title || sectionMatches[0].section.key,
      snippet: buildSnippet(sectionMatches[0].sourceText, queryTerms)
    });
  }

  if (documentMatches[0]) {
    citations.push({
      sourceType: "knowledge_document",
      sourceId: documentMatches[0].document.id,
      sourceTitle: documentMatches[0].document.title,
      snippet: buildSnippet(documentMatches[0].sourceText, queryTerms)
    });
  }

  const primaryCitation = citations[0];
  const answerParts: string[] = [];

  if (topProduct) {
    answerParts.push(`${topProduct.title}: ${topProduct.summary}`);
  }

  if (primaryCitation) {
    answerParts.push(primaryCitation.snippet);
  }

  if (citations[1] && citations[1].snippet !== primaryCitation?.snippet) {
    answerParts.push(citations[1].snippet);
  }

  if (topProduct?.specs?.length) {
    const specMatches = topProduct.specs.filter((spec) => scoreBag(`${spec.label} ${spec.value}`, queryTerms) > 0).slice(0, 2);
    if (specMatches.length) {
      answerParts.push(`Relevant specs: ${specMatches.map((spec) => `${spec.label}: ${spec.value}`).join(" | ")}`);
    }
  }

  return {
    found: true,
    answer: answerParts.join(" "),
    highlights: topProduct?.capabilities?.slice(0, 3) ?? [],
    citations,
    recommendedProductId: topProduct?.id ?? null,
    recommendedCategory: topProduct?.category ?? null,
    matchedProduct: topProduct
  };
}

function buildEscalationAnswer(intent: Exclude<AdvisorIntent, "answer">, product: Product | null, groundedAnswer: string, found: boolean) {
  if (intent === "quote") {
    if (product) {
      return `I can help with a quotation request for the ${product.title}. ${groundedAnswer}`;
    }
    return `I can help with a quotation request. ${groundedAnswer}`;
  }

  if (intent === "human") {
    if (product) {
      return `I can connect you with a Welden specialist for the ${product.title}. ${groundedAnswer}`;
    }
    return `I can connect you with a Welden specialist. ${groundedAnswer}`;
  }

  if (product) {
    return `This sounds like a custom engineering requirement around the ${product.title}. I can log this as a lead for Welden's team to review and follow up. ${groundedAnswer}`;
  }

  if (found) {
    return `This sounds like a custom engineering requirement. I can log this as a lead for Welden's team to review and follow up. ${groundedAnswer}`;
  }

  return "This sounds like a custom engineering requirement. I do not have grounded Welden information for it, but I can log it as a lead so Welden's team can review your application and respond.";
}

function getPriorLeadMemory(sessions: Awaited<ReturnType<typeof getAdvisorSessions>>, lead: Lead) {
  const email = lead.email.trim().toLowerCase();
  return sessions.find((session) => session.lead.email.trim().toLowerCase() === email)?.workflow?.publicAdvisorMemory ?? null;
}

function buildGroundedContext(knowledge: KnowledgeAnswer, selectedProduct: Product | null, documents: KnowledgeDocument[], siteSections: SiteSection[]) {

  const productContext = selectedProduct
    ? [
        `Machine: ${selectedProduct.title}`,
        `Category: ${selectedProduct.category}`,
        `Summary: ${selectedProduct.summary}`,
        selectedProduct.detailedDescription ? `Detailed description: ${selectedProduct.detailedDescription}` : null,
        selectedProduct.capabilities?.length ? `Capabilities: ${selectedProduct.capabilities.join(" | ")}` : null,
        selectedProduct.idealUseCases?.length ? `Best fit: ${selectedProduct.idealUseCases.join(" | ")}` : null,
        selectedProduct.industries?.length ? `Industries: ${selectedProduct.industries.join(" | ")}` : null,
        selectedProduct.specs?.length ? `Specs: ${selectedProduct.specs.map((spec) => `${spec.label}: ${spec.value}`).join(" | ")}` : null
      ].filter(Boolean).join("\n")
    : "";

  const siteContext = knowledge.citations
    .filter((citation) => citation.sourceType === "site_section")
    .map((citation) => {
      const section = siteSections.find((entry) => entry.key === citation.sourceId);
      if (!section) return null;
      return `Website section: ${section.title || section.key}\n${buildSiteSectionSourceText(section)}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const documentContext = knowledge.citations
    .filter((citation) => citation.sourceType === "knowledge_document")
    .map((citation) => {
      const document = documents.find((entry) => entry.id === citation.sourceId);
      if (!document) return null;
      return `Knowledge document: ${document.title}\nSummary: ${document.summary}\nExtracted text: ${document.extractedText.slice(0, 1200)}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const citationSummary = knowledge.citations
    .map((citation) => `${citation.sourceTitle}: ${citation.snippet}`)
    .join("\n");

  return {
    summary: [
      selectedProduct ? `Matched machine: ${selectedProduct.title}` : "Matched machine: none",
      knowledge.citations.length ? `Grounded sources: ${knowledge.citations.map((citation) => citation.sourceTitle).join(", ")}` : "Grounded sources: none"
    ].join(" | "),
    prompt: [
      productContext || null,
      siteContext || null,
      documentContext || null,
      citationSummary ? `Citation snippets:\n${citationSummary}` : null,
      knowledge.citations.length ? `Approved source count: ${knowledge.citations.length}` : null
    ].filter(Boolean).join("\n\n")
  };
}

async function generateGroundedAdvisorAnswer(input: {
  question: string;
  transcriptSummary?: string;
  priorMemory?: string | null;
  intent: AdvisorIntent;
  selectedProduct: Product | null;
  knowledge: KnowledgeAnswer;
  documents: KnowledgeDocument[];
  siteSections: SiteSection[];
}): Promise<{ answer: string; ai: AiResponseMetadata }> {
  const fallbackAnswer = input.intent === "answer"
    ? input.knowledge.answer
    : buildEscalationAnswer(input.intent, input.selectedProduct, input.knowledge.answer, input.knowledge.found);

  if (!input.knowledge.found || !input.knowledge.citations.length) {
    return {
      answer: fallbackAnswer,
      ai: {
        provider: "fallback",
        model: null,
        confidence: "low",
        humanHandoffRecommended: input.intent !== "answer",
        groundedContextSummary: null,
        fallbackReason: "no_grounded_context"
      }
    };
  }

  const groundedContext = buildGroundedContext(input.knowledge, input.selectedProduct, input.documents, input.siteSections);

  // FILE GROUNDING (KB docs only, capped at one per request for latency).
  // PR #5 dropped bundled-brochure grounding because it read from local disk;
  // KB docs uploaded by admins live in Cloud Storage and are picked up here.
  // We only consider a file-backed doc if it was already cited as a relevant
  // grounding source, and we re-use the Gemini Files URI from the previous
  // upload until it ages past 40h. Failures degrade silently — the advisor
  // still answers from text grounding.
  const fileData: Array<{ mimeType: string; fileUri: string }> = [];
  const citedDocumentIds = input.knowledge.citations
    .filter((citation) => citation.sourceType === "knowledge_document")
    .map((citation) => citation.sourceId);
  const fileBackedDoc = pickFileBackedDocForGrounding(input.documents, citedDocumentIds);
  if (fileBackedDoc) {
    const file = await getKbDocGeminiFile(fileBackedDoc);
    if (file) fileData.push(file);
  }

  const response = await generateGeminiJson<AdvisorAiPayload>({
    groundedContextSummary: groundedContext.summary,
    system: [
      "You are the Welden website advisor.",
      "Only answer from the provided approved grounding context, which comes from website content and knowledge documents.",
      "Do not invent features, prices, lead times, policies, or machine details.",
      "If the context is insufficient, say so professionally and decline to speculate.",
      "Keep the tone professional, concise, and commercial.",
      "Use rich Markdown formatting (like **bolding** key terms, or using bulleted lists for specs and features) to make your answer highly readable.",
      "Return valid JSON only."
    ].join(" "),
    prompt: [
      `Intent: ${input.intent}`,
      `Visitor question: ${input.question}`,
      input.transcriptSummary ? `Current browser-session transcript summary:\n${input.transcriptSummary.slice(-1800)}` : null,
      input.priorMemory ? `Lead-linked memory summary:\n${input.priorMemory}` : null,
      `Approved grounding context:\n${groundedContext.prompt}`,
      "JSON schema:",
      '{ "answer": "string", "confidence": "high|medium|low", "humanHandoffRecommended": true, "groundedContextSummary": "string" }'
    ].filter(Boolean).join("\n\n"),
    fileData: fileData.length ? fileData : undefined
  });

  if (!response.ok || !response.data.answer?.trim()) {
    return {
      answer: fallbackAnswer,
      ai: {
        ...response.metadata,
        confidence: "low",
        humanHandoffRecommended: input.intent !== "answer" || !input.knowledge.found
      }
    };
  }

  const groundedAnswer = response.data.answer.trim();
  return {
    answer: input.intent === "answer"
      ? groundedAnswer
      : buildEscalationAnswer(input.intent, input.selectedProduct, groundedAnswer, input.knowledge.found),
    ai: {
      ...response.metadata,
      confidence: response.data.confidence ?? "medium",
      humanHandoffRecommended: response.data.humanHandoffRecommended ?? input.intent !== "answer",
      groundedContextSummary: response.data.groundedContextSummary ?? response.metadata.groundedContextSummary
    }
  };
}

function buildPublicAdvisorMemoryEntry(input: {
  selectedProduct: Product | null;
  question: string;
  answer: string;
  intent: AdvisorIntent;
  quotationReference?: string | null;
}) {
  const answerSummary = input.answer.replace(/\s+/g, " ").trim().slice(0, 220);
  return [
    input.selectedProduct ? `Machine in discussion: ${input.selectedProduct.title}.` : null,
    `Latest visitor request: ${input.question.trim()}`,
    input.intent === "quote"
      ? `Latest outcome: quotation requested${input.quotationReference ? ` and issued under ${input.quotationReference}` : ""}.`
      : `Latest outcome: ${answerSummary}`
  ].filter(Boolean).join("\n");
}

async function parseUserQuery(input: {
  question: string;
  transcriptSummary?: string;
  products: Product[];
}): Promise<{ intent: AdvisorIntent; matchedProductIds: string[] }> {
  const productCatalog = input.products
    .filter((p) => p.published && p.title.trim())
    .map((p) => `- ID: ${p.id} | Name: ${p.title} | Category: ${p.category}`)
    .join("\n");

  const response = await generateGeminiJson<{ intent: AdvisorIntent; matchedProductIds: string[] }>({
    system: "You are an intelligent router for the Welden Industries chatbot. Your job is to read the user's message (and conversation transcript) and determine their intent, and if they are asking about specific machines from our catalog.",
    prompt: `Available Machines:\n${productCatalog}\n\nUser Question: ${input.question}\nTranscript Summary: ${input.transcriptSummary || "none"}\n\nIntent must be one of: "quote", "human", "custom_requirement", "answer".\nIf the user is asking for a price, estimate, quotation, or commercial terms, intent is "quote".\nIf the user asks to speak to a human or sales, intent is "human".\nIf the user describes a custom application or engineering requirement, intent is "custom_requirement".\nOtherwise, intent is "answer".\n\nmatchedProductIds should be an array of machine IDs the user is referring to (from the Available Machines list). Be smart about partial names or typos (e.g. "pipe cutting" -> Automatic Pipe Cutting Machine). If the user asks for quotes for all products, return all IDs.\n\nReturn JSON only.`,
    groundedContextSummary: null
  });

  if (!response.ok || !response.data) {
    return { intent: "answer", matchedProductIds: [] };
  }

  const validIntents = ["quote", "human", "custom_requirement", "answer"];
  const intent = validIntents.includes(response.data.intent) ? (response.data.intent as AdvisorIntent) : "answer";
  const matchedProductIds = Array.isArray(response.data.matchedProductIds) ? response.data.matchedProductIds : [];

  return { intent, matchedProductIds };
}

async function generateEngineeringBrief(input: {
  question: string;
  transcriptSummary?: string;
  selectedProduct: Product | null;
  knowledgeContext: string;
}): Promise<{ userSummary: string; engineeringBrief: string; feasible: boolean }> {
  const productContext = input.selectedProduct 
    ? `Baseline Machine: ${input.selectedProduct.title}\nCapabilities: ${input.selectedProduct.capabilities?.join(", ") || "None"}\nSpecs: ${input.selectedProduct.specs?.map((s) => `${s.label}: ${s.value}`).join("\n") || "None"}`
    : "No baseline machine identified.";

  const prompt = `User Custom Requirement: ${input.question}\nTranscript Summary: ${input.transcriptSummary || "none"}\n\n${productContext}\n\nRelevant Knowledge Base Content:\n${input.knowledgeContext}`;

  const response = await generateGeminiJson<{ userSummary: string; engineeringBrief: string; feasible: boolean }>({
    system: "You are an expert Applications Engineer at Welden Industries. A prospective customer has a custom technical requirement. Perform a gap analysis against our standard machinery. Return JSON containing:\n1. 'userSummary' (a polite, consultative reply to the user explaining technical feasibility, max 3 sentences)\n2. 'engineeringBrief' (a highly technical, bulleted engineering brief outlining the specific mechanical/software deviations required, meant for internal engineering staff)\n3. 'feasible' (boolean, whether this fits within Welden's general domain).",
    prompt,
    groundedContextSummary: "Custom Requirement Feasibility Check"
  });

  if (!response.ok || !response.data) {
    return {
      userSummary: "This sounds like a highly specific engineering requirement. I will log this for our technical team to review and follow up with you.",
      engineeringBrief: "Failed to generate AI engineering brief. Please review the customer's request manually.",
      feasible: false
    };
  }

  return response.data;
}

export async function handleAdvisorChat(input: {
  lead: Lead;
  question: string;
  transcriptSummary?: string;
}): Promise<PublicAdvisorResponse> {
  const [products, documents, siteSections, quotationTemplates, advisorSessions] = await Promise.all([
    readCollection<Product[]>("products"),
    readCollection<KnowledgeDocument[]>("knowledge-documents"),
    readCollection<SiteSection[]>("site-sections"),
    getQuotationTemplates(),
    getAdvisorSessions()
  ]);
  const { intent, matchedProductIds } = await parseUserQuery({
    question: input.question,
    transcriptSummary: input.transcriptSummary,
    products
  });

  const explicitlyMentionedProduct = products.find((p) => p.id === matchedProductIds[0]) ?? null;
  const requestedQuoteProducts = intent === "quote" 
    ? products.filter((p) => matchedProductIds.includes(p.id)) 
    : [];

  const knowledge = answerFromKnowledgeBase(products, documents, siteSections, input.question, explicitlyMentionedProduct);
  const selectedProduct = explicitlyMentionedProduct ?? knowledge.matchedProduct ?? requestedQuoteProducts[0] ?? null;
  const selectedCategory = selectedProduct?.category ?? knowledge.recommendedCategory;
  const priorLeadMemory = getPriorLeadMemory(advisorSessions, input.lead);
  
  let answerText = "";
  let engineeringBriefText: string | null = null;
  let aiMetadata: AiResponseMetadata = { provider: "gemini" };
  
  if (intent === "custom_requirement") {
    const briefContext = knowledge.citations.map((c) => c.snippet).join("\n\n");
    const briefResult = await generateEngineeringBrief({
      question: input.question,
      transcriptSummary: input.transcriptSummary,
      selectedProduct,
      knowledgeContext: briefContext
    });
    answerText = briefResult.userSummary;
    engineeringBriefText = briefResult.engineeringBrief;
    aiMetadata = {
      provider: "gemini",
      confidence: briefResult.feasible ? "high" : "low",
      humanHandoffRecommended: true,
      groundedContextSummary: "Engineering Gap Analysis"
    };
  } else {
    const generated = await generateGroundedAdvisorAnswer({
      question: input.question,
      transcriptSummary: input.transcriptSummary,
      priorMemory: priorLeadMemory,
      intent,
      selectedProduct,
      knowledge,
      documents,
      siteSections
    });
    answerText = generated.answer;
    aiMetadata = generated.ai;
  }

  const quality = assessLeadQuality(input.lead);
  const session = await createLeadFromInquiry({
    lead: input.lead,
    source: "chatbot",
    question: input.question,
    machineInterest: selectedCategory,
    transcriptSummary: input.transcriptSummary ?? answerText,
    quality,
    escalated: intent !== "answer" || !knowledge.found,
    recommendation: {
      recommendedProductId: selectedProduct?.id ?? knowledge.recommendedProductId,
      recommendedCategory: selectedCategory,
      confidence: knowledge.found ? (explicitlyMentionedProduct ? "high" : "medium") : "needs_engineer_review",
      explanation: answerText,
      highlights: selectedProduct?.capabilities?.slice(0, 3) ?? knowledge.highlights,
      citations: knowledge.citations,
      escalationReason: knowledge.found ? undefined : "No grounded website or KB answer",
      engineeringBrief: engineeringBriefText
    },
    diagnostics: {
      intent,
      found: knowledge.found,
      quoteAsked: intent === "quote",
      preliminaryQuotationId: null,
      preliminaryQuotationReference: null,
      matchedProductId: selectedProduct?.id ?? knowledge.recommendedProductId,
      matchedCategory: selectedCategory
    }
  });

  let quotationReference: string | null = null;

  if (intent === "quote") {
    const quoteProducts = requestedQuoteProducts.length
      ? requestedQuoteProducts
      : selectedProduct
        ? [selectedProduct]
        : [];

    const issuedQuotes: Array<{ productTitle: string; referenceNumber: string; delivered: boolean }> = [];
    const skippedProducts: string[] = [];

    if (quoteProducts.length === 0) {
      answerText = "I would be happy to help with a quotation. Could you please specify which machine or category you are interested in?";
    } else {
      for (const product of quoteProducts) {
        const matchedQuotationTemplates = getActiveQuotationTemplatesForProduct(product, quotationTemplates);
        if (!matchedQuotationTemplates.length) {
          skippedProducts.push(product.title);
          continue;
        }

      const primaryTemplate = matchedQuotationTemplates[0];
      const quotation = matchedQuotationTemplates.length === 1
        ? await issuePreliminaryQuotation({
            template: primaryTemplate,
            requester: input.lead,
            productTitle: product.title,
            advisorSessionId: session.id
          })
        : await issueVariantPreliminaryQuotation({
            templates: matchedQuotationTemplates,
            requester: input.lead,
            productTitle: product.title,
            advisorSessionId: session.id
          });

      const delivery = await sendQuotationEmail({
        to: [input.lead.email],
        quotation,
        variantLabel: matchedQuotationTemplates.length === 1 ? (primaryTemplate.variantLabel ?? null) : "Multiple variants"
      });

      await attachQuotationToAdvisorSession({
        sessionId: session.id,
        quotationId: quotation.id,
        quotationReference: quotation.referenceNumber,
        quotationTitle: quotation.quoteTitle,
        quotationSnapshot: quotation.quoteBody,
        quotationPrice: quotation.basePrice,
        quotationCurrency: quotation.currency,
        quotedMachineName: product.title,
        quotedVariantLabel: matchedQuotationTemplates.length === 1 ? (primaryTemplate.variantLabel ?? null) : "Multiple variants",
        activityBody: delivery.delivered
          ? `Preliminary quotation ${quotation.referenceNumber} issued and emailed for ${product.title}.`
          : `Preliminary quotation ${quotation.referenceNumber} prepared for ${product.title}, but email delivery needs review.`,
        emailDeliveryFailed: !delivery.delivered
      });

      issuedQuotes.push({
        productTitle: product.title,
        referenceNumber: quotation.referenceNumber,
        delivered: delivery.delivered
      });
    }
    }

    quotationReference = issuedQuotes.length === 1
      ? issuedQuotes[0].referenceNumber
      : issuedQuotes.length > 1
        ? issuedQuotes.map((quote) => quote.referenceNumber).join(", ")
        : null;

    if (issuedQuotes.length) {
      const deliveredCount = issuedQuotes.filter((quote) => quote.delivered).length;
      const preparedCount = issuedQuotes.length - deliveredCount;
      const quoteSummary = issuedQuotes
        .map((quote) => `${quote.productTitle} (${quote.referenceNumber})`)
        .join(", ");

      answerText = deliveredCount === issuedQuotes.length
        ? `Thank you, ${input.lead.name.split(" ")[0]}. I sent ${issuedQuotes.length > 1 ? `${issuedQuotes.length} preliminary quotations` : "your preliminary quotation"} to ${input.lead.email}: ${quoteSummary}. Our team will follow up with the next commercial and technical discussion shortly.`
        : `Thank you, ${input.lead.name.split(" ")[0]}. I prepared ${issuedQuotes.length} preliminary quotation${issuedQuotes.length > 1 ? "s" : ""} for ${input.lead.email}: ${quoteSummary}. Delivered now: ${deliveredCount}. Pending manual follow-up: ${preparedCount}.`;

      if (skippedProducts.length) {
        answerText += ` Template not available yet for: ${skippedProducts.join(", ")}.`;
      }
    } else if (quoteProducts.length) {
      answerText = `I logged your quotation request, but I could not find an active quotation template for ${quoteProducts.map((product) => product.title).join(", ")}. Our team will follow up manually.`;
    }
  }

  const publicMemory = mergePublicAdvisorMemorySummary(
    priorLeadMemory,
    buildPublicAdvisorMemoryEntry({
      selectedProduct,
      question: input.question,
      answer: answerText,
      intent,
      quotationReference
    })
  );
  await updateAdvisorSessionPublicMemory({ sessionId: session.id, summary: publicMemory });

  return {
    intent,
    answer: answerText,
    found: knowledge.found,
    highlights: selectedProduct?.capabilities?.slice(0, 3) ?? knowledge.highlights,
    citations: knowledge.citations,
    recommendedCategory: selectedCategory,
    quotationReference,
    quality,
    sessionId: session.id,
    ai: aiMetadata
  };
}
