"use client";

import Image from "next/image";
import { GripVertical, Plus } from "lucide-react";
import { formatPipeItem, iconForSiteSection, machineDetailFieldGroups, parseNamedItems, parsePipeItem } from "@/components/admin/shared/admin-panel-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function SiteContentView({ ctx }: { ctx: any }) {
  const {
    tab,
    currentUser,
    showSiteContentEditor,
    setShowSiteContentEditor,
    visibleSiteSections,
    selectedSiteSection,
    setSelectedSiteSectionKey,
    updateSiteSection,
    saveSections,
    heroSlides,
    createHeroSlide,
    selectedHeroSlide,
    setSelectedHeroSlideId,
    draggedHeroSlideId,
    setDraggedHeroSlideId,
    moveHeroSlide,
    deleteHeroSlide,
    updateHeroSlide,
    handleHeroImageUpload,
    updateNamedSiteItem,
    updatePlainSiteItem,
    machineDetailItems,
    getSaveButtonLabel,
    isUploadingHeroImage,
  } = ctx;

  return (<div className="space-y-6">
              {showSiteContentEditor && selectedSiteSection ? (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Landing page section</div>
                      <h2 className="mt-2 text-4xl font-black tracking-tight text-primary ">{selectedSiteSection.key.split(/[-_]/).map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")}</h2>
                      <p className="mt-2 text-sm leading-6 text-secondary md:text-base">
                        {selectedSiteSection.key === "hero"
                          ? "Manage the live hero slides, their order, and each slide's image and copy in one dedicated editor."
                          : selectedSiteSection.key === "machine_cards"
                            ? "Control whether the published machine cards appear on the homepage. This is separate from the machine lineup intro copy."
                            : selectedSiteSection.title || "Edit the selected homepage block in a full-width section workspace."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant={selectedSiteSection.published !== false ? "success" : "outline"}>{selectedSiteSection.published !== false ? "Published" : "Draft"}</Badge>
                        <Badge variant="outline">{selectedSiteSection.key}</Badge>
                        <Badge variant="outline">{selectedSiteSection.items?.length ?? 0} items</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" onClick={() => setShowSiteContentEditor(false)}>Back to sections</Button>
                      <Button onClick={saveSections}>{getSaveButtonLabel("site-content-save", "Save site content")}</Button>
                    </div>
                  </div>

                  <Card className="border border-outline-variant/15 shadow-sm">
                    <CardContent className="space-y-6 p-6">
                      <div className="grid gap-4 lg:grid-cols-[0.72fr_0.28fr]">
                        <div className="space-y-4">
                          {selectedSiteSection.key !== "hero" && selectedSiteSection.key !== "machine_cards" ? (
                            <>
                              <div className="grid gap-3 md:grid-cols-2"><Input placeholder="Eyebrow" value={selectedSiteSection.eyebrow} onChange={(e) => updateSiteSection(selectedSiteSection.key, { eyebrow: e.target.value })} /><Input placeholder="Title" value={selectedSiteSection.title} onChange={(e) => updateSiteSection(selectedSiteSection.key, { title: e.target.value })} /></div>
                              <Textarea rows={selectedSiteSection.key === "footer" ? 4 : 6} placeholder="Body" value={selectedSiteSection.body} onChange={(e) => updateSiteSection(selectedSiteSection.key, { body: e.target.value })} />
                            </>
                          ) : null}

                          {selectedSiteSection.key === "machine_cards" ? (
                            <div className="rounded-2xl border border-outline-variant/15 bg-white p-6">
                              <div className="text-sm font-semibold text-on-surface">Homepage machine cards</div>
                              <div className="mt-3 text-lg font-black tracking-tight text-primary">Separate visibility control for the landing-page card rail</div>
                              <div className="mt-3 text-sm leading-7 text-secondary">
                                Use this section to show or hide the machine cards independently from the `Machine lineup` intro copy. The card content itself still comes from each published machine in the Machines workspace.
                              </div>
                            </div>
                          ) : null}

                          {selectedSiteSection.key === "hero" ? (
                            <div className="space-y-4 rounded-2xl border border-outline-variant/15 bg-surface-container-low/50 p-4">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                  <div className="text-sm font-semibold text-on-surface">Hero slides</div>
                                  <div className="mt-2 text-sm leading-6 text-secondary">Add only the slides you want on the homepage hero. Drag to reorder, click to edit, and delete when a slide is no longer needed.</div>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                  <div className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-secondary">{heroSlides.length} slides</div>
                                  <Button variant="outline" onClick={createHeroSlide}><Plus className="mr-2 h-4 w-4" />Add slide</Button>
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                {heroSlides.map((slide: any, index: number) => {
                                  const isSelected = selectedHeroSlide?.id === slide.id;
                                  const isDragged = draggedHeroSlideId === slide.id;
                                  return (
                                    <button
                                      key={slide.id}
                                      type="button"
                                      draggable={currentUser.role === "admin"}
                                      onClick={() => setSelectedHeroSlideId(slide.id)}
                                      onDragStart={() => setDraggedHeroSlideId(slide.id)}
                                      onDragEnd={() => setDraggedHeroSlideId(null)}
                                      onDragOver={(event) => event.preventDefault()}
                                      onDrop={(event) => {
                                        event.preventDefault();
                                        if (draggedHeroSlideId) {
                                          moveHeroSlide(draggedHeroSlideId, slide.id);
                                        }
                                      }}
                                      className={cn("overflow-hidden rounded-2xl border bg-white text-left transition", isSelected ? "border-primary/30 shadow-md ring-1 ring-primary/15" : "border-outline-variant/15 hover:border-primary/20 hover:shadow-sm", isDragged && "bg-primary-fixed/30")}
                                    >
                                      <div className="flex items-center justify-between border-b border-outline-variant/10 px-4 py-3">
                                        <div className="text-sm font-semibold text-on-surface">Slide {String(index + 1).padStart(2, "0")}</div>
                                        <GripVertical className="h-4 w-4 text-secondary" />
                                      </div>
                                      <div className="aspect-[4/3] bg-surface-container-highest">
                                        {slide.imageUrl ? <Image src={slide.imageUrl} alt={slide.title} width={640} height={480} unoptimized className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-secondary">No image</div>}
                                      </div>
                                      <div className="space-y-1 px-4 py-4">
                                        <div className="text-sm font-black tracking-tight text-primary">{slide.title}</div>
                                        <div className="line-clamp-2 text-sm leading-6 text-secondary">{slide.summary}</div>
                                      </div>
                                    </button>
                                  );
                                })}
                                {!heroSlides.length ? <div className="rounded-2xl border border-dashed border-outline-variant/15 bg-white px-6 py-10 text-center text-sm text-secondary md:col-span-2 xl:col-span-4">No hero slides yet. Add a slide to start building the hero.</div> : null}
                              </div>

                              {selectedHeroSlide ? (
                                <div className="grid gap-4 lg:grid-cols-[0.38fr_0.62fr]">
                                  <div className="rounded-2xl border border-outline-variant/15 bg-white p-4">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="text-xs font-medium text-secondary">Live preview</div>
                                      <Button variant="outline" size="sm" onClick={() => deleteHeroSlide(selectedHeroSlide.id)}>Delete slide</Button>
                                    </div>
                                    <div className="mt-4 overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-highest">
                                      {selectedHeroSlide.imageUrl ? <Image src={selectedHeroSlide.imageUrl} alt={selectedHeroSlide.title} width={640} height={480} unoptimized className="aspect-[4/3] h-full w-full object-cover" style={{ objectPosition: selectedHeroSlide.imagePosition || "center center" }} /> : <div className="flex aspect-[4/3] items-center justify-center text-sm text-secondary">No hero image selected</div>}
                                    </div>
                                    <div className="mt-4 space-y-2 rounded-xl bg-surface-container-low px-4 py-4">
                                      <div className="text-xs font-medium text-secondary">Text preview</div>
                                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">{selectedHeroSlide.eyebrow || "Welden Industries"}</div>
                                      <div className="text-xl font-black tracking-tight text-primary">{selectedHeroSlide.title}</div>
                                      <div className="text-sm leading-6 text-secondary">{selectedHeroSlide.summary}</div>
                                    </div>
                                  </div>
                                  <div className="space-y-4 rounded-2xl border border-outline-variant/15 bg-white p-4">
                                    <div>
                                      <div className="text-xs font-medium text-secondary">Edit selected slide</div>
                                      <div className="mt-2 text-lg font-black tracking-tight text-primary">Slide content and image</div>
                                    </div>
                                    <Input placeholder="Eyebrow" value={selectedHeroSlide.eyebrow ?? ""} onChange={(e) => updateHeroSlide(selectedHeroSlide.id, { eyebrow: e.target.value })} />
                                    <Input placeholder="Headline" value={selectedHeroSlide.title} onChange={(e) => updateHeroSlide(selectedHeroSlide.id, { title: e.target.value })} />
                                    <Textarea rows={3} placeholder="One-line USP" value={selectedHeroSlide.summary} onChange={(e) => updateHeroSlide(selectedHeroSlide.id, { summary: e.target.value })} />
                                    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                                      <Input placeholder="Hero image URL" value={selectedHeroSlide.imageUrl} onChange={(e) => updateHeroSlide(selectedHeroSlide.id, { imageUrl: e.target.value })} />
                                      <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-outline-variant/15 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-fixed/30">
                                        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleHeroImageUpload} disabled={isUploadingHeroImage} />
                                        {isUploadingHeroImage ? "Uploading..." : "Upload image"}
                                      </label>
                                    </div>
                                    <Input placeholder="Image position e.g. center center" value={selectedHeroSlide.imagePosition ?? "center center"} onChange={(e) => updateHeroSlide(selectedHeroSlide.id, { imagePosition: e.target.value })} />
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {selectedSiteSection.key === "hero" ? (
                            <div className="rounded-2xl border border-outline-variant/15 bg-white p-4">
                              <div className="text-sm font-semibold text-on-surface">Hero CTA buttons</div>
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <label className="grid gap-2 text-sm">
                                  <span className="text-xs font-medium text-secondary">Primary button label</span>
                                  <Input placeholder="Talk to our expert" value={parseNamedItems(selectedSiteSection.items).cta_primary ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "cta_primary", e.target.value)} />
                                </label>
                                <label className="grid gap-2 text-sm">
                                  <span className="text-xs font-medium text-secondary">Secondary button label</span>
                                  <Input placeholder="Explore machines" value={parseNamedItems(selectedSiteSection.items).cta_secondary ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "cta_secondary", e.target.value)} />
                                </label>
                              </div>
                            </div>
                          ) : null}

                          {selectedSiteSection.key === "footer" ? (
                            <div className="space-y-4 rounded-2xl border border-outline-variant/15 bg-white p-4">
                              <div>
                                <div className="text-sm font-semibold text-on-surface">Footer links</div>
                                <div className="mt-4 grid gap-3">
                                  {Array.from({ length: 3 }).map((_, index) => {
                                    const plainItems = (selectedSiteSection.items ?? []).filter((item: string) => !item.startsWith("social_") && !item.startsWith("custom_social_"));
                                    const namedItems = (selectedSiteSection.items ?? []).filter((item: string) => item.startsWith("social_") || item.startsWith("custom_social_"));
                                    const link = parsePipeItem(plainItems[index] ?? "");
                                    return (
                                      <div key={index} className="grid gap-3 md:grid-cols-2">
                                        <Input placeholder="Link label" value={link.primary} onChange={(e) => {
                                          const nextItems = [...plainItems];
                                          nextItems[index] = formatPipeItem(e.target.value, link.secondary);
                                          updateSiteSection(selectedSiteSection.key, { items: [...nextItems.filter((item, itemIndex) => item.trim() || itemIndex < 3), ...namedItems] });
                                        }} />
                                        <Input placeholder="Link URL or anchor" value={link.secondary} onChange={(e) => {
                                          const nextItems = [...plainItems];
                                          nextItems[index] = formatPipeItem(link.primary, e.target.value);
                                          updateSiteSection(selectedSiteSection.key, { items: [...nextItems.filter((item, itemIndex) => item.trim() || itemIndex < 3), ...namedItems] });
                                        }} />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="rounded-xl border border-outline-variant/12 bg-surface-container-low/40 p-4">
                                <div className="text-sm font-semibold text-on-surface">Social links</div>
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                  <Input placeholder="LinkedIn URL" value={parseNamedItems(selectedSiteSection.items).social_linkedin ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "social_linkedin", e.target.value)} />
                                  <Input placeholder="Twitter URL" value={parseNamedItems(selectedSiteSection.items).social_twitter ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "social_twitter", e.target.value)} />
                                  <Input placeholder="Instagram URL" value={parseNamedItems(selectedSiteSection.items).social_instagram ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "social_instagram", e.target.value)} />
                                  <Input placeholder="YouTube URL" value={parseNamedItems(selectedSiteSection.items).social_youtube ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "social_youtube", e.target.value)} />
                                  <Input placeholder="Vimeo URL" value={parseNamedItems(selectedSiteSection.items).social_vimeo ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "social_vimeo", e.target.value)} />
                                </div>
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                  <Input placeholder="Custom social label" value={parseNamedItems(selectedSiteSection.items).custom_social_one_label ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "custom_social_one_label", e.target.value)} />
                                  <Input placeholder="Custom social URL" value={parseNamedItems(selectedSiteSection.items).custom_social_one_url ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "custom_social_one_url", e.target.value)} />
                                  <Input placeholder="Second custom social label" value={parseNamedItems(selectedSiteSection.items).custom_social_two_label ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "custom_social_two_label", e.target.value)} />
                                  <Input placeholder="Second custom social URL" value={parseNamedItems(selectedSiteSection.items).custom_social_two_url ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "custom_social_two_url", e.target.value)} />
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {selectedSiteSection.key === "contact" ? (
                            <div className="rounded-2xl border border-outline-variant/15 bg-white p-4">
                              <div className="text-sm font-semibold text-on-surface">Contact actions</div>
                              <div className="mt-4 grid gap-4">
                                {Array.from({ length: 3 }).map((_, index) => (
                                  <Input
                                    key={index}
                                    placeholder={`Visible contact line ${index + 1}`}
                                    value={(selectedSiteSection.items ?? []).filter((item: string) => !item.includes("|"))[index] ?? ""}
                                    onChange={(e) => updatePlainSiteItem(selectedSiteSection.key, index, e.target.value, 3)}
                                  />
                                ))}
                                <Input placeholder="WhatsApp button label" value={parseNamedItems(selectedSiteSection.items).whatsapp_label ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "whatsapp_label", e.target.value)} />
                                <Input placeholder="WhatsApp number with country code" value={parseNamedItems(selectedSiteSection.items).whatsapp_number ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "whatsapp_number", e.target.value)} />
                              </div>
                              <div className="rounded-xl border border-outline-variant/12 bg-surface-container-low/40 p-4">
                                <div className="text-sm font-semibold text-on-surface">CTA buttons</div>
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                  <Input placeholder="Quote CTA label" value={parseNamedItems(selectedSiteSection.items).cta_quote ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "cta_quote", e.target.value)} />
                                  <Input placeholder="Chatbot CTA label" value={parseNamedItems(selectedSiteSection.items).cta_chatbot ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "cta_chatbot", e.target.value)} />
                                </div>
                              </div>
                              <div className="rounded-xl border border-outline-variant/12 bg-surface-container-low/40 p-4">
                                <div className="text-sm font-semibold text-on-surface">Form labels</div>
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                  <Input placeholder="Form heading" value={parseNamedItems(selectedSiteSection.items).form_heading ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "form_heading", e.target.value)} />
                                  <Input placeholder="Response posture line" value={parseNamedItems(selectedSiteSection.items).form_response ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "form_response", e.target.value)} />
                                  <Input placeholder="Submit button label" value={parseNamedItems(selectedSiteSection.items).form_submit ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "form_submit", e.target.value)} />
                                  <Input placeholder="Chatbot fallback link label" value={parseNamedItems(selectedSiteSection.items).form_chatbot_cta ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, "form_chatbot_cta", e.target.value)} />
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {selectedSiteSection.key === "machine_details" ? (
                            <div className="rounded-2xl border border-outline-variant/15 bg-white p-4">
                              <div className="text-sm font-semibold text-on-surface">Machine detail page copy</div>
                              <div className="mt-4 space-y-6">
                                {machineDetailFieldGroups.map((group) => (
                                  <div key={group.title} className="space-y-3 rounded-xl border border-outline-variant/12 bg-surface-container-low/40 p-4">
                                    <div className="text-sm font-semibold text-on-surface">{group.title}</div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                      {group.fields.map(([fieldKey, label]) => (
                                        <label key={fieldKey} className="grid gap-2 text-sm">
                                          <span className="text-xs font-medium text-secondary">{label}</span>
                                          <Input value={machineDetailItems[fieldKey] ?? ""} onChange={(e) => updateNamedSiteItem(selectedSiteSection.key, fieldKey, e.target.value)} placeholder={label} />
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {selectedSiteSection.key !== "footer" && selectedSiteSection.key !== "contact" && selectedSiteSection.key !== "machine_cards" && selectedSiteSection.key !== "machine_details" ? (
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-secondary">Items</div>
                              <Textarea
                                rows={6}
                                placeholder="One item per line"
                                value={(selectedSiteSection.items ?? []).join("\n")}
                                onChange={(e) => updateSiteSection(selectedSiteSection.key, {
                                  items: e.target.value.replaceAll("\r", "").split("\n").map((item: string) => item.trim()).filter(Boolean)
                                })}
                              />
                            </div>
                          ) : null}
                        </div>
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low/50 p-4">
                            <div className="text-xs font-medium text-secondary">Section controls</div>
                            <div className="mt-4 space-y-4 text-sm leading-6 text-secondary">
                              <label className="flex items-center gap-2 text-sm font-medium text-on-surface"><input type="checkbox" checked={selectedSiteSection.published !== false} onChange={(e) => updateSiteSection(selectedSiteSection.key, { published: e.target.checked })} />Published on site</label>
                              <div>Section key: <span className="font-semibold text-on-surface">{selectedSiteSection.key}</span></div>
                              <div>Items: <span className="font-semibold text-on-surface">{selectedSiteSection.items?.length ?? 0}</span></div>
                              {selectedSiteSection.key === "hero" ? <div>Hero now uses a dedicated slide list. Add or delete slides as needed, click a slide card to edit its headline and image, then drag cards to reorder the live sequence.</div> : null}
                              {selectedSiteSection.key === "machine_cards" ? <div>This publish switch controls only the landing-page machine cards. It no longer controls the machine lineup headline or summary copy.</div> : null}
                              {selectedSiteSection.key === "footer" ? <div>Footer title is the brand name, body is the supporting sentence, and you can manage both footer links and social profile URLs here.</div> : null}
                              {selectedSiteSection.key === "contact" ? <div>Set visible contact lines here, then add the WhatsApp CTA settings for faster lead capture from the public site.</div> : null}
                              {!["hero", "footer", "machine_cards"].includes(selectedSiteSection.key) ? <div>Use items for compact supporting bullets and keep the body focused on one clear message.</div> : null}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-outline-variant/15 bg-white p-4">
                            <div className="text-xs font-medium text-secondary">Section snapshot</div>
                            <div className="mt-4 space-y-3 text-sm text-secondary">
                              <div className="rounded-xl bg-surface-container-low p-4">
                                <div className="text-xs font-medium text-secondary">Current title</div>
                                <div className="mt-2 text-base font-semibold text-on-surface">{selectedSiteSection.title || "Untitled section"}</div>
                              </div>
                              <div className="rounded-xl bg-surface-container-low p-4">
                                <div className="text-xs font-medium text-secondary">Body length</div>
                                <div className="mt-2 text-base font-semibold text-on-surface">{selectedSiteSection.body?.length ?? 0} characters</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="grid gap-3 sm:grid-cols-3 xl:max-w-3xl xl:flex-1">
                      <div className="rounded-2xl border border-outline-variant/15 bg-white px-6 py-4 shadow-sm">
                        <div className="text-sm font-semibold text-on-surface">Sections</div>
                        <div className="mt-3 text-3xl font-black tracking-tight text-primary">{visibleSiteSections.length}</div>
                        <div className="mt-1 text-sm text-secondary">Landing page sections in the content library.</div>
                      </div>
                      <div className="rounded-2xl border border-outline-variant/15 bg-white px-6 py-4 shadow-sm">
                        <div className="text-sm font-semibold text-on-surface">Published</div>
                        <div className="mt-3 text-3xl font-black tracking-tight text-primary">{visibleSiteSections.filter((section: any) => section.published !== false).length}</div>
                        <div className="mt-1 text-sm text-secondary">Sections currently live on the public site.</div>
                      </div>
                      <div className="rounded-2xl border border-outline-variant/15 bg-white px-6 py-4 shadow-sm">
                        <div className="text-sm font-semibold text-on-surface">Editor mode</div>
                        <div className="mt-3 text-lg font-black tracking-tight text-primary">Section library</div>
                        <div className="mt-1 text-sm text-secondary">Open one block at a time in a full-screen editor.</div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={saveSections}>{getSaveButtonLabel("site-content-save", "Save site content")}</Button>
                    </div>
                  </div>

                  <Card className="border border-outline-variant/15 shadow-sm">
                    <CardHeader className="pb-4"><CardTitle>Landing page sections</CardTitle><CardDescription>Open a section to edit its content in a dedicated full-screen workspace.</CardDescription></CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {visibleSiteSections.map((section: any) => {
                          const isActive = selectedSiteSection?.key === section.key;
                          const displayLabel = section.key.split(/[-_]/).map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
                          const SectionIcon = iconForSiteSection(section.key);
                          const isPublished = section.published !== false;
                          const heroPreviewSlide = section.key === "hero" ? section.slides?.[0] ?? null : null;
                          const sectionDescription = section.key === "hero"
                            ? "Slides, image order, headline, and mobile-safe visual balance."
                            : section.key === "machine_cards"
                              ? "Controls whether the published machine cards appear on the landing page."
                              : section.title || `Open the ${displayLabel.toLowerCase()} section editor.`;
                          return (
                            <button
                              key={section.key}
                              type="button"
                              onClick={() => {
                                setSelectedSiteSectionKey(section.key);
                                setShowSiteContentEditor(true);
                              }}
                              className={cn(
                                "group overflow-hidden rounded-3xl border text-left transition duration-150",
                                isActive
                                  ? "border-primary/30 bg-primary text-white shadow-[0_18px_40px_-28px_rgba(6,61,122,0.9)]"
                                  : "border-outline-variant/15 bg-white hover:border-primary/20 hover:bg-surface-container-low hover:shadow-sm",
                              )}
                            >
                              <div className={cn("flex items-center justify-between border-b px-6 py-4", isActive ? "border-white/12 bg-white/8" : "border-outline-variant/10 bg-surface-container-low/40")}>
                                <div className="flex items-center gap-3">
                                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", isActive ? "bg-white/14 text-white" : "bg-primary-fixed/25 text-primary")}>
                                    <SectionIcon className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <div className={cn("text-lg font-black tracking-tight", isActive ? "text-white" : "text-primary")}>{displayLabel}</div>
                                    <div className={cn("mt-1 text-xs font-bold uppercase tracking-[0.22em]", isActive ? "text-white/70" : "text-secondary")}>{section.key}</div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <div className={cn("rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.16em]", isActive ? "bg-white/14 text-white" : "bg-primary-fixed/30 text-primary")}>{section.items?.length ?? 0} items</div>
                                  <div className={cn("rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.16em]", isActive ? (isPublished ? "bg-emerald-400/20 text-emerald-50" : "bg-white/10 text-white/80") : (isPublished ? "bg-emerald-500/12 text-emerald-700" : "bg-surface-container-high text-secondary"))}>{isPublished ? "Live" : "Draft"}</div>
                                </div>
                              </div>
                              {heroPreviewSlide ? (
                                <div className="px-6 pt-5">
                                  <div className={cn("overflow-hidden rounded-3xl border", isActive ? "border-white/12" : "border-outline-variant/12")}>
                                    <div className="relative aspect-[16/10] bg-surface-container-highest">
                                      {heroPreviewSlide.imageUrl ? <Image src={heroPreviewSlide.imageUrl} alt={heroPreviewSlide.title} fill unoptimized sizes="(min-width: 1280px) 20rem, (min-width: 640px) 50vw, 100vw" className="object-cover" /> : null}
                                      <div className={cn("absolute inset-0 bg-gradient-to-t from-black/75 via-black/18 to-transparent", isActive ? "opacity-90" : "opacity-100")} />
                                      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Live hero preview</div>
                                        <div className="mt-2 text-lg font-black leading-tight">{heroPreviewSlide.title || "Homepage hero"}</div>
                                        <div className="mt-2 line-clamp-2 text-sm leading-5 text-white/80">{heroPreviewSlide.summary || "Slides, image order, headline, and mobile-safe visual balance."}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                              <div className="space-y-4 px-6 py-6">
                                <div className={cn("text-sm leading-6", isActive ? "text-white/82" : "text-secondary")}>{sectionDescription}</div>
                                <div className="flex items-center justify-between">
                                  <div className={cn("text-xs font-bold uppercase tracking-[0.18em]", isActive ? "text-white/70" : "text-secondary")}>{heroPreviewSlide ? "Edit hero workspace" : "Open full editor"}</div>
                                  <div className={cn("text-sm font-semibold", isActive ? "text-white" : "text-primary")}>Edit section</div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
  );
}






