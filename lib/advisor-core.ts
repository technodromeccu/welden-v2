import type { Product, SiteSection } from "./types";

export type AdvisorIntent = "quote" | "human" | "custom_requirement" | "answer";

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function tokenize(value: string) {
  return normalizeText(value).split(/\s+/).filter(Boolean);
}

export function scoreBag(text: string, queryTerms: string[]) {
  const bag = normalizeText(text);
  return queryTerms.reduce((score, term) => score + (bag.includes(term) ? 1 : 0), 0);
}

export function buildSnippet(sourceText: string, queryTerms: string[]) {
  const sentences = sourceText
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const ranked = sentences
    .map((sentence) => ({ sentence, score: scoreBag(sentence, queryTerms) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.sentence ?? sentences[0] ?? sourceText.slice(0, 180);
}

export function buildSiteSectionSourceText(section: SiteSection) {
  return [
    section.eyebrow,
    section.title,
    section.body,
    ...(section.items ?? []),
    ...(section.slides ?? []).flatMap((slide) => [slide.eyebrow ?? "", slide.title, slide.summary])
  ]
    .filter(Boolean)
    .join(" ");
}
