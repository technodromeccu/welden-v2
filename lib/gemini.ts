import type { AiProvider, AiResponseMetadata } from "./types";

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Temperature: Google recommends 1.0 (the default) for Gemini 3.x; lowering it can
// degrade reasoning. Kept env-configurable so a more deterministic value can be set
// for grounded RAG without a code change. Falls back to 1.0 on an invalid value.
const DEFAULT_GEMINI_TEMPERATURE = (() => {
  const parsed = Number(process.env.GEMINI_TEMPERATURE?.trim());
  return Number.isFinite(parsed) ? parsed : 1.0;
})();

// Thinking level: "low" cuts advisor latency and token cost versus the Gemini 3.x
// default of "high". Env-configurable; invalid values fall back to "low".
const VALID_THINKING_LEVELS = new Set(["minimal", "low", "medium", "high"]);
const DEFAULT_GEMINI_THINKING_LEVEL = (() => {
  const value = process.env.GEMINI_THINKING_LEVEL?.trim();
  return value && VALID_THINKING_LEVELS.has(value) ? value : "low";
})();

type GeminiJsonResult<T> =
  | {
      ok: true;
      data: T;
      metadata: AiResponseMetadata;
    }
  | {
      ok: false;
      error: string;
      metadata: AiResponseMetadata;
    };

type GeminiCandidate = {
  content?: {
    parts?: Array<{ text?: string }>;
  };
};

function metadata(input: Partial<AiResponseMetadata> & { provider: AiProvider }): AiResponseMetadata {
  return {
    provider: input.provider,
    model: input.model ?? null,
    confidence: input.confidence ?? null,
    humanHandoffRecommended: input.humanHandoffRecommended ?? false,
    groundedContextSummary: input.groundedContextSummary ?? null,
    fallbackReason: input.fallbackReason ?? null
  };
}

function extractJsonText(payload: unknown) {
  const body = payload as { candidates?: GeminiCandidate[] } | null;
  const candidates = Array.isArray(body?.candidates) ? body.candidates : [];
  const first = candidates[0];
  const parts = first?.content?.parts ?? [];
  return parts.map((part) => part.text ?? "").join("").trim();
}

export function getGeminiModel() {
  return DEFAULT_GEMINI_MODEL;
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function generateGeminiJson<T>(input: {
  system: string;
  prompt: string;
  model?: string;
  groundedContextSummary?: string | null;
  inlineData?: Array<{ mimeType: string; data: string }>;
  fileData?: Array<{ mimeType: string; fileUri: string }>;
}): Promise<GeminiJsonResult<T>> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = input.model?.trim() || DEFAULT_GEMINI_MODEL;

  if (!apiKey) {
    return {
      ok: false,
      error: "Gemini API key is not configured.",
      metadata: metadata({
        provider: "fallback",
        model,
        groundedContextSummary: input.groundedContextSummary,
        fallbackReason: "missing_api_key"
      })
    };
  }

  try {
    const response = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: input.system }]
        },
        contents: [
          {
            role: "user",
            parts: [
              { text: input.prompt },
              ...(input.inlineData ?? []).map((file) => ({
                inlineData: {
                  mimeType: file.mimeType,
                  data: file.data
                }
              })),
              ...(input.fileData ?? []).map((file) => ({
                fileData: {
                  mimeType: file.mimeType,
                  fileUri: file.fileUri
                }
              }))
            ]
          }
        ],
        generationConfig: {
          temperature: DEFAULT_GEMINI_TEMPERATURE,
          topP: 0.9,
          responseMimeType: "application/json",
          thinkingConfig: {
            thinkingLevel: DEFAULT_GEMINI_THINKING_LEVEL
          }
        }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        ok: false,
        error: `Gemini request failed (${response.status}). ${errorBody}`.trim(),
        metadata: metadata({
          provider: "fallback",
          model,
          groundedContextSummary: input.groundedContextSummary,
          fallbackReason: `http_${response.status}`
        })
      };
    }

    const payload = await response.json();
    const text = extractJsonText(payload);
    if (!text) {
      return {
        ok: false,
        error: "Gemini returned an empty response.",
        metadata: metadata({
          provider: "fallback",
          model,
          groundedContextSummary: input.groundedContextSummary,
          fallbackReason: "empty_response"
        })
      };
    }

    return {
      ok: true,
      data: JSON.parse(text) as T,
      metadata: metadata({
        provider: "gemini",
        model,
        groundedContextSummary: input.groundedContextSummary
      })
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gemini request failed.",
      metadata: metadata({
        provider: "fallback",
        model,
        groundedContextSummary: input.groundedContextSummary,
        fallbackReason: "request_failed"
      })
    };
  }
}
