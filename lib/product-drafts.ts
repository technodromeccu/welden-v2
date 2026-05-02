import crypto from "crypto";
import { nowIso, readCollection, writeCollection } from "./store";
import { mergeProductWithDraft, normalizeProduct, normalizeProductDraftPayload, normalizeProductDraftRecord, productToDraftPayload } from "./products";
import type { Product, ProductDraftPayload, ProductDraftRecord } from "./types";

const PRODUCT_DRAFT_COLLECTION = "product-drafts";

export async function getProductDrafts() {
  const drafts = await readCollection<ProductDraftRecord[]>(PRODUCT_DRAFT_COLLECTION);
  return drafts
    .map((draft) => normalizeProductDraftRecord(draft))
    .filter((draft): draft is ProductDraftRecord => Boolean(draft));
}

export async function saveProductDrafts(drafts: ProductDraftRecord[]) {
  await writeCollection(PRODUCT_DRAFT_COLLECTION, drafts);
}

export function hashProductDraftPayload(payload: ProductDraftPayload) {
  return crypto.createHash("sha1").update(JSON.stringify(normalizeProductDraftPayload(payload))).digest("hex");
}

export function buildProductDraftRecord(input: {
  productId: string;
  publishedProduct: Product;
  draft: Partial<ProductDraftPayload>;
  updatedByUserId: string;
}) {
  const normalizedDraft = normalizeProductDraftPayload(input.draft);
  return {
    productId: input.productId,
    draft: normalizedDraft,
    updatedAt: nowIso(),
    updatedByUserId: input.updatedByUserId,
    publishedSnapshotHash: hashProductDraftPayload(productToDraftPayload(normalizeProduct(input.publishedProduct)))
  } satisfies ProductDraftRecord;
}

export function applyDraftToProduct(product: Product, draftRecord?: ProductDraftRecord | null) {
  return mergeProductWithDraft(product, draftRecord);
}
