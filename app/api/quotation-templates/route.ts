import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/origin-check";
import { buildDefaultQuotationTemplate, getQuotationTemplates, saveQuotationTemplates } from "@/lib/quotations";
import { makeId, nowIso, readCollection } from "@/lib/store";
import type { Product, QuotationTemplate } from "@/lib/types";

function lines(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export async function GET() {
  const auth = await requireApiUser(["admin", "manager"]);
  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json(await getQuotationTemplates());
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

  const body = await request.json();
  const templates = await getQuotationTemplates();
  const products = await readCollection<Product[]>("products");
  const product = products.find((entry) => entry.id === body.productId) ?? null;
  const stamp = nowIso();

  const template: QuotationTemplate = {
    ...(product ? buildDefaultQuotationTemplate(product) : {
      id: makeId("qtpl"),
      title: "New preliminary quotation template",
      productId: null,
      productSlug: null,
      machineName: body.machineName ?? "New machine",
      variantLabel: null,
      active: true,
      currency: "INR",
      basePrice: "On request",
      intro: "Thank you for your interest in Welden Industries. Please find the preliminary quotation summary below.",
      scopeItems: [],
      technicalSpecifications: [],
      generalNotes: [],
      bankDetails: [],
      exclusions: [],
      deliveryNote: "Delivery timeline will be confirmed after technical approval and commercial acceptance.",
      installationNote: "Installation and commissioning can be scoped separately if required.",
      warrantyNote: "Warranty terms will follow the final formal quotation and accepted scope of supply.",
      paymentTerms: "Payment terms to be finalized during commercial discussion.",
      validityNote: "This preliminary quotation is subject to technical and commercial confirmation.",
      termsAndConditions: [],
      footerNote: "Please reply on the same Welden thread to continue with the next step.",      companyName: "Welden Industries",
      companyAddress: "",
      companyPhone: "",
      companyWebsite: "www.welden.in",
      createdAt: stamp,
      updatedAt: stamp
    }),
    id: makeId("qtpl"),
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : (product ? `${product.title} preliminary quotation` : "New preliminary quotation template"),
    productId: typeof body.productId === "string" ? body.productId : product?.id ?? null,
    productSlug: product?.slug ?? null,
    machineName: typeof body.machineName === "string" && body.machineName.trim() ? body.machineName.trim() : (product?.title ?? "New machine"),
    variantLabel: typeof body.variantLabel === "string" ? body.variantLabel : null,
    active: typeof body.active === "boolean" ? body.active : true,
    currency: typeof body.currency === "string" ? body.currency : "INR",
    basePrice: typeof body.basePrice === "string" ? body.basePrice : "On request",
    intro: typeof body.intro === "string" ? body.intro : "",
    scopeItems: lines(body.scopeItems),
    technicalSpecifications: lines(body.technicalSpecifications),
    generalNotes: lines(body.generalNotes),
    bankDetails: lines(body.bankDetails),
    exclusions: lines(body.exclusions),
    deliveryNote: typeof body.deliveryNote === "string" ? body.deliveryNote : "",
    installationNote: typeof body.installationNote === "string" ? body.installationNote : "",
    warrantyNote: typeof body.warrantyNote === "string" ? body.warrantyNote : "",
    paymentTerms: typeof body.paymentTerms === "string" ? body.paymentTerms : "",
    validityNote: typeof body.validityNote === "string" ? body.validityNote : "",
    termsAndConditions: lines(body.termsAndConditions),
    footerNote: typeof body.footerNote === "string" ? body.footerNote : "",    companyName: typeof body.companyName === "string" ? body.companyName : "Welden Industries",
    companyAddress: typeof body.companyAddress === "string" ? body.companyAddress : "",
    companyPhone: typeof body.companyPhone === "string" ? body.companyPhone : "",
    companyWebsite: typeof body.companyWebsite === "string" ? body.companyWebsite : "www.welden.in",
    createdAt: stamp,
    updatedAt: stamp
  };

  templates.unshift(template);
  await saveQuotationTemplates(templates);
  return NextResponse.json(template);
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

  const body = await request.json() as { orderedIds?: string[] };
  const templates = await getQuotationTemplates();
  const orderedIds = body.orderedIds ?? [];

  if (!Array.isArray(orderedIds) || orderedIds.length !== templates.length) {
    return NextResponse.json({ error: "A complete orderedIds list is required." }, { status: 400 });
  }

  const templateMap = new Map(templates.map((template) => [template.id, template]));
  const reordered = orderedIds.map((id) => templateMap.get(id)).filter(Boolean) as QuotationTemplate[];
  if (reordered.length !== templates.length) {
    return NextResponse.json({ error: "orderedIds contains unknown quotation template ids." }, { status: 400 });
  }

  await saveQuotationTemplates(reordered);
  return NextResponse.json(reordered);
}


