"use client";

import { ClipboardList, Eye, GripVertical, Plus, Search } from "lucide-react";
import { emptyQuotationTemplateDraft, textToLines } from "@/components/admin/shared/admin-panel-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function QuotationTemplatesView({ ctx }: { ctx: any }) {
  const {
    data,
    showAddQuotationTemplate,
    showQuotationTemplateEditor,
    newQuotationTemplate,
    setNewQuotationTemplate,
    createQuotationTemplate,
    quotationSearch,
    setQuotationSearch,
    filteredQuotationTemplates,
    draggedQuotationTemplateId,
    setDraggedQuotationTemplateId,
    moveQuotationTemplate,
    setSelectedQuotationTemplateId,
    selectedQuotationTemplateId,
    selectedQuotationTemplate,
    quotationTemplateDraft,
    setQuotationTemplateDraft,
    selectedQuotationTemplateLinkedProduct,
    saveQuotationTemplate,
    deleteQuotationTemplate,
    getCreateButtonLabel,
    getSaveButtonLabel,
    setShowAddQuotationTemplate,
    setShowQuotationTemplateEditor,
  } = ctx;

  return (<div className="space-y-6">
              {!showAddQuotationTemplate && !showQuotationTemplateEditor ? (
              <>
              <div className="grid gap-4 xl:grid-cols-3">
                <Card className="border border-outline-variant/15 bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Template library</div>
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <div>
                        <div className="text-3xl font-black tracking-tight text-primary">{data.quotationTemplates.length}</div>
                        <div className="mt-1 text-sm text-secondary">Commercial quotation templates currently maintained in the CMS.</div>
                      </div>
                      <Badge variant="outline">Commercial</Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-emerald-200/70 bg-emerald-50/60 shadow-sm">
                  <CardContent className="p-6">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Active templates</div>
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <div>
                        <div className="text-3xl font-black tracking-tight text-primary">{data.quotationTemplates.filter((template: any) => template.active).length}</div>
                        <div className="mt-1 text-sm text-secondary">Templates currently available for chatbot-issued preliminary quotations.</div>
                      </div>
                      <Badge variant="success">Live</Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-primary/10 bg-primary-fixed/20 shadow-sm">
                  <CardContent className="p-6">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Machine coverage</div>
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <div>
                        <div className="text-3xl font-black tracking-tight text-primary">{new Set(data.quotationTemplates.map((template: any) => template.productId).filter(Boolean)).size}</div>
                        <div className="mt-1 text-sm text-secondary">Distinct machines currently mapped to a commercial quotation template.</div>
                      </div>
                      <Badge variant="secondary">Linked</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              </>
              ) : null}

              {showAddQuotationTemplate ? (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Creating template</div>
                      <h2 className="mt-2 text-4xl font-black tracking-tight text-primary ">Add quotation template</h2>
                      <p className="mt-2 text-sm leading-6 text-secondary md:text-base">Create a preliminary quotation template in the same commercial workspace used for editing, so new templates start clean and structured.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" onClick={() => setShowAddQuotationTemplate(false)}>Back to templates</Button>
                      <Button onClick={createQuotationTemplate}>{getCreateButtonLabel("quotation-template-create", "Create template")}</Button>
                    </div>
                  </div>
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,0.68fr)_minmax(320px,0.32fr)]">
                    <Card className="border border-outline-variant/15 shadow-sm">
                      <CardHeader>
                        <CardTitle>Add quotation template</CardTitle>
                        <CardDescription>Set the machine, price, scope, and commercial terms up front so the chatbot can issue a clean preliminary quotation from day one.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="rounded-2xl border border-primary/10 bg-primary-fixed/20 p-6">
                          <div className="text-sm font-semibold text-on-surface">Commercial summary</div>
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <Input placeholder="Template title" value={newQuotationTemplate.title} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, title: e.target.value }))} />
                            <select className="h-11 rounded-xl border border-outline-variant/15 bg-white px-3 text-sm text-on-surface outline-none" value={newQuotationTemplate.productId} onChange={(e) => { const product = data.products.find((entry: any) => entry.id === e.target.value); setNewQuotationTemplate((current: any) => ({ ...current, productId: e.target.value, machineName: product?.title ?? current.machineName })); }}>
                              <option value="">Select machine</option>
                              {data.products.filter((product: any) => product.title.trim()).map((product: any) => <option key={product.id} value={product.id}>{product.title}</option>)}
                            </select>
                            <Input placeholder="Machine name" value={newQuotationTemplate.machineName} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, machineName: e.target.value }))} />
                            <Input placeholder="Variant label" value={newQuotationTemplate.variantLabel} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, variantLabel: e.target.value }))} />
                            <Input placeholder="Currency" value={newQuotationTemplate.currency} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, currency: e.target.value }))} />
                            <Input placeholder="Base price" value={newQuotationTemplate.basePrice} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, basePrice: e.target.value }))} />
                          </div>
                          <div className="mt-4 grid gap-2">
                            <span className="text-xs font-medium text-secondary">Offer introduction</span>
                            <Textarea rows={4} placeholder="Intro" value={newQuotationTemplate.intro} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, intro: e.target.value }))} />
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-4">
                            <div className="text-sm font-semibold text-on-surface">Scope and technical definition</div>
                            <div className="mt-4 grid gap-4">
                              <div className="grid gap-2">
                                <span className="text-xs font-medium text-secondary">Scope items</span>
                                <Textarea rows={10} placeholder="Scope items, one per line" value={newQuotationTemplate.scopeItems} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, scopeItems: e.target.value }))} />
                              </div>
                              <div className="grid gap-2">
                                <span className="text-xs font-medium text-secondary">Technical specifications</span>
                                <Textarea rows={10} placeholder="Technical specifications, one per line" value={newQuotationTemplate.technicalSpecifications} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, technicalSpecifications: e.target.value }))} />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="text-sm font-semibold text-on-surface">General notes and commercial terms</div>
                            <div className="mt-4 grid gap-4">
                              <div className="grid gap-2">
                                <span className="text-xs font-medium text-secondary">General notes</span>
                                <Textarea rows={6} placeholder="General notes, one per line" value={newQuotationTemplate.generalNotes} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, generalNotes: e.target.value }))} />
                              </div>
                              <div className="grid gap-2">
                                <span className="text-xs font-medium text-secondary">Exclusions</span>
                                <Textarea rows={6} placeholder="Exclusions, one per line" value={newQuotationTemplate.exclusions} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, exclusions: e.target.value }))} />
                              </div>
                              <div className="grid gap-2">
                                <span className="text-xs font-medium text-secondary">Terms and conditions</span>
                                <Textarea rows={6} placeholder="Terms and conditions, one per line" value={newQuotationTemplate.termsAndConditions} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, termsAndConditions: e.target.value }))} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="text-sm font-semibold text-on-surface">Delivery, payment, and footer</div>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <Input placeholder="Delivery note" value={newQuotationTemplate.deliveryNote} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, deliveryNote: e.target.value }))} />
                            <Input placeholder="Installation note" value={newQuotationTemplate.installationNote} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, installationNote: e.target.value }))} />
                            <Input placeholder="Warranty note" value={newQuotationTemplate.warrantyNote} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, warrantyNote: e.target.value }))} />
                            <Input placeholder="Payment terms" value={newQuotationTemplate.paymentTerms} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, paymentTerms: e.target.value }))} />
                            <Input className="md:col-span-2" placeholder="Validity note" value={newQuotationTemplate.validityNote} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, validityNote: e.target.value }))} />
                            <div className="grid gap-2 md:col-span-2">
                              <span className="text-xs font-medium text-secondary">Bank details</span>
                              <Textarea rows={6} placeholder="Bank details, one per line" value={newQuotationTemplate.bankDetails} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, bankDetails: e.target.value }))} />
                            </div>
                            <div className="grid gap-2 md:col-span-2">
                              <span className="text-xs font-medium text-secondary">Footer note</span>
                              <Textarea rows={5} placeholder="Footer note" value={newQuotationTemplate.footerNote} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, footerNote: e.target.value }))} />
                            </div>
                            <Input placeholder="Company name" value={newQuotationTemplate.companyName} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, companyName: e.target.value }))} />
                            <Input placeholder="Company website" value={newQuotationTemplate.companyWebsite} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, companyWebsite: e.target.value }))} />
                            <Input className="md:col-span-2" placeholder="Company address" value={newQuotationTemplate.companyAddress} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, companyAddress: e.target.value }))} />
                            <Input className="md:col-span-2" placeholder="Company phone" value={newQuotationTemplate.companyPhone} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, companyPhone: e.target.value }))} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-6">
                      <Card className="border border-outline-variant/15 shadow-sm">
                        <CardHeader className="pb-4">
                          <CardTitle>Draft snapshot</CardTitle>
                          <CardDescription>Keep the creation flow grounded while you build out the commercial structure.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="rounded-2xl border border-primary/12 bg-primary-fixed/20 p-4">
                            <div className="text-xs font-medium text-secondary">Base price</div>
                            <div className="mt-2 text-3xl font-black tracking-tight text-primary">{newQuotationTemplate.currency || "INR"} {newQuotationTemplate.basePrice || "On request"}</div>
                          </div>
                          <div className="grid gap-3">
                            <div className="rounded-xl bg-surface-container-low p-4">
                              <div className="text-xs font-medium text-secondary">Linked machine</div>
                              <div className="mt-2 text-sm font-semibold leading-6 text-on-surface">{data.products.find((product: any) => product.id === newQuotationTemplate.productId)?.title || newQuotationTemplate.machineName || "Not linked yet"}</div>
                            </div>
                            <div className="rounded-xl bg-surface-container-low p-4">
                              <div className="text-xs font-medium text-secondary">Variant</div>
                              <div className="mt-2 text-sm font-semibold leading-6 text-on-surface">{newQuotationTemplate.variantLabel || "Default quotation"}</div>
                            </div>
                            <div className="rounded-xl bg-surface-container-low p-4">
                              <div className="text-xs font-medium text-secondary">Commercial depth</div>
                              <div className="mt-2 space-y-2 text-sm text-secondary">
                                <div>{textToLines(newQuotationTemplate.scopeItems).length} scope items</div>
                                <div>{textToLines(newQuotationTemplate.technicalSpecifications).length} specification lines</div>
                                <div>{textToLines(newQuotationTemplate.termsAndConditions).length} terms lines</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border border-outline-variant/15 shadow-sm">
                        <CardHeader className="pb-4">
                          <CardTitle>Chatbot preview</CardTitle>
                          <CardDescription>This is how a new template will read when the chatbot issues the preliminary quotation.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-2xl border border-outline-variant/12 bg-white p-4 text-sm leading-6 text-on-surface shadow-sm">
                            <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Preliminary quotation</div>
                            <div className="mt-3 font-semibold text-primary">Issued to: {"{Customer Name}"}</div>
                            <div className="mt-1 text-secondary">Reference: {"{Auto-generated quotation ref}"}</div>
                            <div className="mt-4 text-base font-bold text-on-surface">{newQuotationTemplate.machineName || "Machine name"}</div>
                            {newQuotationTemplate.variantLabel ? <div className="mt-1 text-secondary">{newQuotationTemplate.variantLabel}</div> : null}
                            <div className="mt-4 rounded-xl bg-surface-container-low px-4 py-3 font-semibold text-on-surface">{newQuotationTemplate.currency || "INR"} {newQuotationTemplate.basePrice || "On request"} - Preliminary quotation only</div>
                            <div className="mt-4 text-secondary">{newQuotationTemplate.intro || "The opening note for the quotation will appear here."}</div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border border-outline-variant/15 shadow-sm">
                        <CardHeader className="pb-4">
                          <CardTitle>Create controls</CardTitle>
                          <CardDescription>Keep the creation actions and state together while you prepare the template.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <label className="flex items-center gap-2 text-sm text-secondary"><input type="checkbox" checked={newQuotationTemplate.active} onChange={(e) => setNewQuotationTemplate((current: any) => ({ ...current, active: e.target.checked }))} />Active template</label>
                          <div className="flex flex-wrap gap-3">
                            <Button onClick={createQuotationTemplate}>{getCreateButtonLabel("quotation-template-create", "Create template")}</Button>
                            <Button variant="outline" onClick={() => { setShowAddQuotationTemplate(false); setNewQuotationTemplate(emptyQuotationTemplateDraft); }}>Cancel</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              ) : null}

{!showAddQuotationTemplate && !showQuotationTemplateEditor ? (
              <Card className="overflow-hidden border border-outline-variant/10 shadow-sm">
                <CardHeader className="border-b border-outline-variant/10 bg-white/90 pb-5">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-2xl">
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Template library</div>
                      <div className="mt-2 text-3xl font-black tracking-tight text-primary">Commercial quotation templates</div>
                      <p className="mt-2 text-sm leading-6 text-secondary">Browse, reorder, and open machine-linked commercial templates without leaving the quotation workspace.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                      <div className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-secondary">{filteredQuotationTemplates.length} in view</div>
                      <div className="rounded-full bg-primary-fixed/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-secondary">Drag cards to reorder</div>
                      <Button className="rounded-lg px-6 py-2.5" onClick={() => { setShowQuotationTemplateEditor(false); setShowAddQuotationTemplate(true); }}><Plus className="mr-2 h-4 w-4" />Add template</Button>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full max-w-xl">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary/60" />
                      <Input className="pl-10" placeholder="Search quotation template title, machine, variant, or price..." value={quotationSearch} onChange={(e) => setQuotationSearch(e.target.value)} />
                    </div>
                    <div className="text-sm text-secondary">Open any card to edit pricing, scope, and chatbot output.</div>
                  </div>
                </CardHeader>
                <CardContent className="bg-surface-container-low/40 p-6 md:p-6">
                  {filteredQuotationTemplates.length ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                      {filteredQuotationTemplates.map((template: any) => {
                        const linkedProduct = data.products.find((product: any) => product.id === template.productId) ?? null;
                        return (
                          <button
                            key={template.id}
                            type="button"
                            draggable
                            onDragStart={() => setDraggedQuotationTemplateId(template.id)}
                            onDragEnd={() => setDraggedQuotationTemplateId(null)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              event.preventDefault();
                              if (draggedQuotationTemplateId) {
                                void moveQuotationTemplate(draggedQuotationTemplateId, template.id);
                              }
                            }}
                            onClick={() => {
                              setSelectedQuotationTemplateId(template.id);
                              setShowAddQuotationTemplate(false);
                              setShowQuotationTemplateEditor(true);
                            }}
                            className={cn(
                              "group w-full rounded-3xl border border-outline-variant/12 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/15 hover:shadow-md",
                              draggedQuotationTemplateId === template.id && "border-primary/30 bg-primary-fixed/25",
                              selectedQuotationTemplateId === template.id && "border-primary/25 ring-1 ring-primary/10"
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed/35 text-primary">
                                  <ClipboardList className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-base font-bold text-on-surface">{template.title}</div>
                                  <div className="mt-1 truncate text-sm text-secondary">{template.machineName}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-secondary">
                                <div className="flex cursor-grab items-center gap-1 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                                  <GripVertical className="h-4 w-4" />
                                  Sort
                                </div>
                                <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]", template.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{template.active ? "Active" : "Inactive"}</span>
                              </div>
                            </div>

                            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                              <div className="rounded-2xl bg-surface-container-low p-4">
                                <div className="text-xs font-medium text-secondary">Base price</div>
                                <div className="mt-2 text-lg font-black tracking-tight text-primary">{template.currency} {template.basePrice || "On request"}</div>
                              </div>
                              <div className="rounded-2xl bg-surface-container-low p-4">
                                <div className="text-xs font-medium text-secondary">Variant</div>
                                <div className="mt-2 text-sm font-semibold leading-6 text-on-surface">{template.variantLabel || "Default quotation"}</div>
                              </div>
                              <div className="rounded-2xl bg-surface-container-low p-4">
                                <div className="text-xs font-medium text-secondary">Linked machine</div>
                                <div className="mt-2 text-sm font-semibold leading-6 text-on-surface">{linkedProduct?.slug ?? "Not linked"}</div>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{textToLines(template.scopeItems).length} scope lines</Badge>
                              <Badge variant="outline">{textToLines(template.technicalSpecifications).length} specs</Badge>
                              <Badge variant="outline">{textToLines(template.termsAndConditions).length} terms</Badge>
                              {linkedProduct ? <Badge variant="secondary">Machine linked</Badge> : <Badge variant="outline">Machine pending</Badge>}
                            </div>

                            <div className="mt-6 flex items-center justify-between border-t border-outline-variant/10 pt-4 text-sm text-secondary">
                              <span>{linkedProduct?.title || template.machineName || "Machine to be assigned"}</span>
                              <span className="inline-flex items-center gap-2 font-semibold text-primary">Open full editor <Eye className="h-4 w-4" /></span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-outline-variant/15 bg-white px-6 py-12 text-center text-sm text-secondary">
                      No quotation templates match the current search.
                    </div>
                  )}
                </CardContent>
              </Card>
              ) : null}

              {showQuotationTemplateEditor && selectedQuotationTemplate ? (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-4xl">
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Editing template - {selectedQuotationTemplate.title}</div>
                      <h2 className="mt-2 text-4xl font-black tracking-tight text-primary ">{quotationTemplateDraft.machineName || selectedQuotationTemplate.machineName}</h2>
                      <p className="mt-2 text-sm leading-6 text-secondary md:text-base">A cleaner commercial editor for machine-linked preliminary quotations, with pricing, scope, terms, and preview context in one place.</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Badge variant={quotationTemplateDraft.active ? "success" : "outline"}>{quotationTemplateDraft.active ? "Active" : "Inactive"}</Badge>
                        <Badge variant="outline">{quotationTemplateDraft.currency} {quotationTemplateDraft.basePrice}</Badge>
                        {selectedQuotationTemplateLinkedProduct ? <Badge variant="secondary">{selectedQuotationTemplateLinkedProduct.slug}</Badge> : null}
                        {quotationTemplateDraft.variantLabel ? <Badge variant="outline">{quotationTemplateDraft.variantLabel}</Badge> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" onClick={() => setShowQuotationTemplateEditor(false)}>Back to templates</Button>
                      <Button onClick={saveQuotationTemplate}>{getSaveButtonLabel("quotation-template-save", "Save template")}</Button>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[minmax(0,0.68fr)_minmax(320px,0.32fr)]">
                    <Card className="border border-outline-variant/15 shadow-sm">
                      <CardHeader>
                        <CardTitle>Edit quotation template</CardTitle>
                        <CardDescription>Keep the commercial source of truth clear and grouped by meaning instead of one long undifferentiated field stack.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="rounded-2xl border border-primary/10 bg-primary-fixed/20 p-6">
                          <div className="text-sm font-semibold text-on-surface">Commercial summary</div>
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <Input placeholder="Template title" value={quotationTemplateDraft.title} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, title: e.target.value }))} />
                            <select
                              className="h-11 rounded-xl border border-outline-variant/15 bg-white px-3 text-sm text-on-surface outline-none"
                              value={quotationTemplateDraft.productId}
                              onChange={(e) => {
                                const product = data.products.find((entry: any) => entry.id === e.target.value);
                                setQuotationTemplateDraft((current: any) => ({
                                  ...current,
                                  productId: e.target.value,
                                  machineName: product?.title ?? current.machineName
                                }));
                              }}
                            >
                              <option value="">Select machine</option>
                              {data.products.filter((product: any) => product.title.trim()).map((product: any) => (
                                <option key={product.id} value={product.id}>{product.title}</option>
                              ))}
                            </select>
                            <Input placeholder="Machine name" value={quotationTemplateDraft.machineName} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, machineName: e.target.value }))} />
                            <Input placeholder="Variant label" value={quotationTemplateDraft.variantLabel} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, variantLabel: e.target.value }))} />
                            <Input placeholder="Currency" value={quotationTemplateDraft.currency} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, currency: e.target.value }))} />
                            <Input placeholder="Base price" value={quotationTemplateDraft.basePrice} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, basePrice: e.target.value }))} />
                          </div>
                          <div className="mt-4 grid gap-2">
                            <span className="text-xs font-medium text-secondary">Offer introduction</span>
                            <Textarea rows={4} placeholder="Intro" value={quotationTemplateDraft.intro} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, intro: e.target.value }))} />
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-4">
                            <div className="text-sm font-semibold text-on-surface">Scope and technical definition</div>
                            <div className="mt-4 grid gap-4">
                              <div className="grid gap-2">
                                <span className="text-xs font-medium text-secondary">Scope items</span>
                                <Textarea rows={10} placeholder="Scope items, one per line" value={quotationTemplateDraft.scopeItems} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, scopeItems: e.target.value }))} />
                              </div>
                              <div className="grid gap-2">
                                <span className="text-xs font-medium text-secondary">Technical specifications</span>
                                <Textarea rows={10} placeholder="Technical specifications, one per line" value={quotationTemplateDraft.technicalSpecifications} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, technicalSpecifications: e.target.value }))} />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="text-sm font-semibold text-on-surface">General notes and commercial terms</div>
                            <div className="mt-4 grid gap-4">
                              <div className="grid gap-2">
                                <span className="text-xs font-medium text-secondary">General notes</span>
                                <Textarea rows={6} placeholder="General notes, one per line" value={quotationTemplateDraft.generalNotes} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, generalNotes: e.target.value }))} />
                              </div>
                              <div className="grid gap-2">
                                <span className="text-xs font-medium text-secondary">Exclusions</span>
                                <Textarea rows={6} placeholder="Exclusions, one per line" value={quotationTemplateDraft.exclusions} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, exclusions: e.target.value }))} />
                              </div>
                              <div className="grid gap-2">
                                <span className="text-xs font-medium text-secondary">Terms and conditions</span>
                                <Textarea rows={6} placeholder="Terms and conditions, one per line" value={quotationTemplateDraft.termsAndConditions} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, termsAndConditions: e.target.value }))} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="text-sm font-semibold text-on-surface">Delivery, payment, and footer</div>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <Input placeholder="Delivery note" value={quotationTemplateDraft.deliveryNote} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, deliveryNote: e.target.value }))} />
                            <Input placeholder="Installation note" value={quotationTemplateDraft.installationNote} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, installationNote: e.target.value }))} />
                            <Input placeholder="Warranty note" value={quotationTemplateDraft.warrantyNote} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, warrantyNote: e.target.value }))} />
                            <Input placeholder="Payment terms" value={quotationTemplateDraft.paymentTerms} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, paymentTerms: e.target.value }))} />
                            <Input className="md:col-span-2" placeholder="Validity note" value={quotationTemplateDraft.validityNote} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, validityNote: e.target.value }))} />
                            <div className="grid gap-2 md:col-span-2">
                              <span className="text-xs font-medium text-secondary">Bank details</span>
                              <Textarea rows={6} placeholder="Bank details, one per line" value={quotationTemplateDraft.bankDetails} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, bankDetails: e.target.value }))} />
                            </div>
                            <div className="grid gap-2 md:col-span-2">
                              <span className="text-xs font-medium text-secondary">Footer note</span>
                              <Textarea rows={5} placeholder="Footer note" value={quotationTemplateDraft.footerNote} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, footerNote: e.target.value }))} />
                            </div>
                            <Input placeholder="Company name" value={quotationTemplateDraft.companyName} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, companyName: e.target.value }))} />
                            <Input placeholder="Company website" value={quotationTemplateDraft.companyWebsite} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, companyWebsite: e.target.value }))} />
                            <Input className="md:col-span-2" placeholder="Company address" value={quotationTemplateDraft.companyAddress} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, companyAddress: e.target.value }))} />
                            <Input className="md:col-span-2" placeholder="Company phone" value={quotationTemplateDraft.companyPhone} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, companyPhone: e.target.value }))} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-6">
                      <Card className="border border-outline-variant/15 shadow-sm">
                        <CardHeader className="pb-4">
                          <CardTitle>Quote snapshot</CardTitle>
                          <CardDescription>A quick commercial read before you save.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="rounded-2xl border border-primary/12 bg-primary-fixed/20 p-4">
                            <div className="text-xs font-medium text-secondary">Base price</div>
                            <div className="mt-2 text-3xl font-black tracking-tight text-primary">{quotationTemplateDraft.currency || "INR"} {quotationTemplateDraft.basePrice || "On request"}</div>
                          </div>
                          <div className="grid gap-3">
                            <div className="rounded-xl bg-surface-container-low p-4">
                              <div className="text-xs font-medium text-secondary">Linked machine</div>
                              <div className="mt-2 text-sm font-semibold leading-6 text-on-surface">{selectedQuotationTemplateLinkedProduct?.title || quotationTemplateDraft.machineName || "Not linked"}</div>
                            </div>
                            <div className="rounded-xl bg-surface-container-low p-4">
                              <div className="text-xs font-medium text-secondary">Variant</div>
                              <div className="mt-2 text-sm font-semibold leading-6 text-on-surface">{quotationTemplateDraft.variantLabel || "Default quotation"}</div>
                            </div>
                            <div className="rounded-xl bg-surface-container-low p-4">
                              <div className="text-xs font-medium text-secondary">Commercial depth</div>
                              <div className="mt-2 space-y-2 text-sm text-secondary">
                                <div>{textToLines(quotationTemplateDraft.scopeItems).length} scope items</div>
                                <div>{textToLines(quotationTemplateDraft.technicalSpecifications).length} specification lines</div>
                                <div>{textToLines(quotationTemplateDraft.termsAndConditions).length} terms lines</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border border-outline-variant/15 shadow-sm">
                        <CardHeader className="pb-4">
                          <CardTitle>Chatbot preview</CardTitle>
                          <CardDescription>This is the tone and structure the visitor will receive when the chatbot issues the preliminary quotation.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-2xl border border-outline-variant/12 bg-white p-4 text-sm leading-6 text-on-surface shadow-sm">
                            <div className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Preliminary quotation</div>
                            <div className="mt-3 font-semibold text-primary">Issued to: {"{Customer Name}"}</div>
                            <div className="mt-1 text-secondary">Reference: {"{Auto-generated quotation ref}"}</div>
                            <div className="mt-4 text-base font-bold text-on-surface">{quotationTemplateDraft.machineName || "Machine name"}</div>
                            {quotationTemplateDraft.variantLabel ? <div className="mt-1 text-secondary">{quotationTemplateDraft.variantLabel}</div> : null}
                            <div className="mt-4 rounded-xl bg-surface-container-low px-4 py-3 font-semibold text-on-surface">{quotationTemplateDraft.currency || "INR"} {quotationTemplateDraft.basePrice || "On request"} - Preliminary quotation only</div>
                            <div className="mt-4 text-secondary">{quotationTemplateDraft.intro || "The opening note for the quotation will appear here."}</div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border border-outline-variant/15 shadow-sm">
                        <CardHeader className="pb-4">
                          <CardTitle>Template controls</CardTitle>
                          <CardDescription>Keep operational actions together so the commercial editor stays focused.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <label className="flex items-center gap-2 text-sm text-secondary"><input type="checkbox" checked={quotationTemplateDraft.active} onChange={(e) => setQuotationTemplateDraft((current: any) => ({ ...current, active: e.target.checked }))} />Active template</label>
                          <div className="flex flex-wrap gap-3">
                            <Button onClick={saveQuotationTemplate}>{getSaveButtonLabel("quotation-template-save", "Save template")}</Button>
                            <Button variant="outline" onClick={deleteQuotationTemplate}>Delete template</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
  );
}




