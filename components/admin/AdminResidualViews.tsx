"use client";

import { KnowledgeBaseView } from "@/components/admin/knowledge/KnowledgeBaseView";
import { ProductsMachinePagesView } from "@/components/admin/products/ProductsMachinePagesView";
import { QuotationTemplatesView } from "@/components/admin/quotations/QuotationTemplatesView";
import { SiteContentView } from "@/components/admin/content/SiteContentView";

export function AdminResidualViews(props: { ctx: any }) {
  const { tab } = props.ctx;

  return (
    <>
      {tab === "machines" ? <ProductsMachinePagesView ctx={props.ctx} /> : null}
      {tab === "quotation templates" ? <QuotationTemplatesView ctx={props.ctx} /> : null}
      {tab === "knowledge base" ? <KnowledgeBaseView ctx={props.ctx} /> : null}
      {tab === "site content" ? <SiteContentView ctx={props.ctx} /> : null}
    </>
  );
}
