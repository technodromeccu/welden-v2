import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { buildProductDraftRecord, getProductDrafts, saveProductDrafts } from "@/lib/product-drafts";
import { requireSameOrigin } from "@/lib/origin-check";
import { normalizeProductDraftPayload } from "@/lib/products";
import { readCollection } from "@/lib/store";
import type { Product } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const drafts = await getProductDrafts();
  return NextResponse.json(drafts.find((draft) => draft.productId === id) ?? null);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const { id } = await params;
  const body = normalizeProductDraftPayload(await request.json());
  const products = await readCollection<Product[]>("products");
  const product = products.find((entry) => entry.id === id);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const drafts = await getProductDrafts();
  const nextDraft = buildProductDraftRecord({
    productId: id,
    publishedProduct: product,
    draft: body,
    updatedByUserId: auth.user.id
  });
  const nextDrafts = [nextDraft, ...drafts.filter((draft) => draft.productId !== id)];
  await saveProductDrafts(nextDrafts);
  return NextResponse.json(nextDraft);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const { id } = await params;
  const drafts = await getProductDrafts();
  const nextDrafts = drafts.filter((draft) => draft.productId !== id);
  await saveProductDrafts(nextDrafts);
  return NextResponse.json({ ok: true });
}
