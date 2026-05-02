import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/origin-check";
import { normalizeProductDraftPayload } from "@/lib/products";
import { nowIso, readCollection, writeCollection } from "@/lib/store";
import type { Product } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  Object.assign(product, body, { updatedAt: nowIso() });
  await writeCollection("products", products);
  return NextResponse.json(product);
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
  const products = await readCollection<Product[]>("products");
  const nextProducts = products.filter((entry) => entry.id !== id);

  if (nextProducts.length === products.length) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await writeCollection("products", nextProducts);
  return NextResponse.json({ ok: true });
}
