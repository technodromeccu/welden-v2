import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/origin-check";
import { getQuotationTemplates, saveQuotationTemplates } from "@/lib/quotations";
import { nowIso } from "@/lib/store";

function lines(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

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
  const body = await request.json();
  const templates = await getQuotationTemplates();
  const template = templates.find((entry) => entry.id === id);

  if (!template) {
    return NextResponse.json({ error: "Quotation template not found" }, { status: 404 });
  }

  const stringFields = [
    "title",
    "machineName",
    "variantLabel",
    "currency",
    "basePrice",
    "intro",
    "deliveryNote",
    "installationNote",
    "warrantyNote",
    "paymentTerms",
    "validityNote",
    "footerNote",    "companyName",
    "companyAddress",
    "companyPhone",
    "companyWebsite"
  ] as const;

  for (const field of stringFields) {
    if (typeof body[field] === "string") {
      template[field] = body[field];
    }
  }

  if (typeof body.productId === "string" || body.productId === null) {
    template.productId = body.productId;
  }
  if (typeof body.productSlug === "string" || body.productSlug === null) {
    template.productSlug = body.productSlug;
  }
  if (typeof body.active === "boolean") {
    template.active = body.active;
  }
  if (Array.isArray(body.scopeItems)) {
    template.scopeItems = lines(body.scopeItems);
  }
  if (Array.isArray(body.technicalSpecifications)) {
    template.technicalSpecifications = lines(body.technicalSpecifications);
  }
  if (Array.isArray(body.generalNotes)) {
    template.generalNotes = lines(body.generalNotes);
  }
  if (Array.isArray(body.bankDetails)) {
    template.bankDetails = lines(body.bankDetails);
  }
  if (Array.isArray(body.exclusions)) {
    template.exclusions = lines(body.exclusions);
  }
  if (Array.isArray(body.termsAndConditions)) {
    template.termsAndConditions = lines(body.termsAndConditions);
  }

  template.updatedAt = nowIso();
  await saveQuotationTemplates(templates);
  return NextResponse.json(template);
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
  const templates = await getQuotationTemplates();
  const nextTemplates = templates.filter((entry) => entry.id !== id);

  if (nextTemplates.length === templates.length) {
    return NextResponse.json({ error: "Quotation template not found" }, { status: 404 });
  }

  await saveQuotationTemplates(nextTemplates);
  return NextResponse.json({ ok: true });
}


