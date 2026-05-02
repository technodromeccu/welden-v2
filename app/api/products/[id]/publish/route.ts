import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { applyDraftToProduct, getProductDrafts, saveProductDrafts } from "@/lib/product-drafts";
import { requireSameOrigin } from "@/lib/origin-check";
import { nowIso, readCollection, writeCollection } from "@/lib/store";
import type { Product } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const { id } = await params;
  const products = await readCollection<Product[]>("products");
  const drafts = await getProductDrafts();
  const product = products.find((entry) => entry.id === id);
  const draft = drafts.find((entry) => entry.productId === id);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const merged = applyDraftToProduct(product, draft);
  Object.assign(product, merged, {
    updatedAt: nowIso()
  });

  await writeCollection("products", products);
  await saveProductDrafts(drafts.filter((entry) => entry.productId !== id));

  return NextResponse.json(product);
}
