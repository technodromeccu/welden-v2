import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/origin-check";
import { ensureSiteSections } from "@/lib/site-sections";
import { readCollection, writeCollection } from "@/lib/store";
import type { SiteSection } from "@/lib/types";

export async function GET() {
  const auth = await requireApiUser(["admin"]);
  if ("response" in auth) {
    return auth.response;
  }

  const sections = ensureSiteSections(await readCollection<SiteSection[]>("site-sections"));
  return NextResponse.json(sections);
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

  const body = ensureSiteSections((await request.json()) as SiteSection[]);
  await writeCollection("site-sections", body);
  return NextResponse.json(body);
}
