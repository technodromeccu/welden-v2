import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/origin-check";
import { getPreliminaryQuotations, updatePreliminaryQuotationStatus } from "@/lib/quotations";
import type { PreliminaryQuotationStatus } from "@/lib/types";

const allowedStatuses: PreliminaryQuotationStatus[] = ["issued", "review_pending", "follow_up_due", "converted_to_formal_quote", "closed"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(["admin", "manager"]);
  if ("response" in auth) {
    return auth.response;
  }

  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const { id } = await params;
  const body = await request.json() as { status?: PreliminaryQuotationStatus };
  if (!body.status || !allowedStatuses.includes(body.status)) {
    return NextResponse.json({ error: "A valid quotation status is required." }, { status: 400 });
  }

  try {
    return NextResponse.json(await updatePreliminaryQuotationStatus(id, body.status));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update preliminary quotation." }, { status: 404 });
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(["admin", "manager"]);
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const quotations = await getPreliminaryQuotations();
  const quotation = quotations.find((entry) => entry.id === id);
  if (!quotation) {
    return NextResponse.json({ error: "Preliminary quotation not found" }, { status: 404 });
  }

  return NextResponse.json(quotation);
}
