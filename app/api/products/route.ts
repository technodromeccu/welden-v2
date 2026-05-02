import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/origin-check";
import { normalizeProductDraftPayload } from "@/lib/products";
import { makeId, nowIso, readCollection, writeCollection } from "@/lib/store";
import type { Product } from "@/lib/types";

export async function GET() {
  const auth = await requireApiUser(["admin", "manager"]);
  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(await readCollection<Product[]>("products"));
}

export async function POST(request: Request) {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const products = await readCollection<Product[]>("products");
  const body = normalizeProductDraftPayload(await request.json());
  const timestamp = nowIso();
  const product: Product = {
    id: makeId("product"),
    ...body,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  products.unshift(product);
  await writeCollection("products", products);
  return NextResponse.json(product);
}

export async function PUT(request: Request) {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const products = await readCollection<Product[]>("products");
  const body = await request.json() as { orderedIds?: string[] };
  const orderedIds = body.orderedIds ?? [];

  if (!Array.isArray(orderedIds) || orderedIds.length !== products.length) {
    return NextResponse.json({ error: "A complete orderedIds list is required." }, { status: 400 });
  }

  const productMap = new Map(products.map((product) => [product.id, product]));
  const reordered = orderedIds.map((id) => productMap.get(id)).filter(Boolean) as Product[];

  if (reordered.length !== products.length) {
    return NextResponse.json({ error: "orderedIds contains unknown product ids." }, { status: 400 });
  }

  await writeCollection("products", reordered);
  return NextResponse.json(reordered);
}
