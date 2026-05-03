"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function KnowledgeBaseView({ ctx }: { ctx: any }) {
  const {
    currentUser,
    showAddKnowledgeDoc,
    showKnowledgeDocEditor,
    newDoc,
    setNewDoc,
    createDoc,
    selectedDoc,
    docDraft,
    setDocDraft,
    saveDoc,
    setSelectedDocId,
    data,
    getCreateButtonLabel,
    getSaveButtonLabel,
    setShowKnowledgeDocEditor,
    setShowAddKnowledgeDoc,
  } = ctx;

  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, isNew: boolean) {
    const file = e.target.files?.[0];
    if (!file) return;
    const title = isNew ? newDoc.title : docDraft.title;
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentTitle", title);

    setUploading(true);
    try {
      const res = await fetch("/api/uploads/knowledge-document", {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Upload failed");
        return;
      }
      const data = await res.json();
      if (isNew) {
        setNewDoc((c: any) => ({ ...c, fileUrl: data.url, sourceType: file.type.includes("pdf") ? "pdf" : "video" }));
      } else {
        setDocDraft((c: any) => ({ ...c, fileUrl: data.url, sourceType: file.type.includes("pdf") ? "pdf" : "video" }));
      }
    } catch (err) {
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {showAddKnowledgeDoc ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">Creating document</div>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-primary md:text-4xl">Add knowledge document</h2>
              <p className="mt-2 text-sm leading-6 text-secondary md:text-base">Create a grounding source in a full-width editor so summaries, extracted text, and availability are reviewed in one calm workspace.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setShowAddKnowledgeDoc(false)}>Back to library</Button>
              <Button onClick={createDoc}>{getCreateButtonLabel("knowledge-doc-create", "Create document")}</Button>
            </div>
          </div>

          <Card className="border border-outline-variant/15 shadow-sm">
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Draft snapshot</div>
                    <div className="mt-3 space-y-3 text-sm text-secondary">
                      <div className="rounded-xl bg-white p-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Source type</div>
                        <div className="mt-2 text-base font-semibold text-on-surface">{newDoc.sourceType.toUpperCase()}</div>
                      </div>
                      <div className="rounded-xl bg-white p-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Availability</div>
                        <div className="mt-2 text-base font-semibold text-on-surface">{newDoc.active ? "Active immediately" : "Draft only"}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input placeholder="Title" value={newDoc.title} onChange={(e) => setNewDoc((c: any) => ({ ...c, title: e.target.value }))} />
                    <select className="h-11 rounded-xl bg-surface-container-high px-3 text-sm text-on-surface outline-none" value={newDoc.sourceType} onChange={(e) => setNewDoc((c: any) => ({ ...c, sourceType: e.target.value as typeof c.sourceType }))}>
                      <option value="text">Text</option>
                      <option value="pdf">PDF</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                  <Input placeholder="Summary" value={newDoc.summary} onChange={(e) => setNewDoc((c: any) => ({ ...c, summary: e.target.value }))} />
                  
                  {newDoc.sourceType !== "text" && (
                    <div className="rounded-xl border border-outline-variant/20 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary mb-2">Upload source file</div>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-outline-variant/20 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-fixed/30">
                          <input type="file" accept="application/pdf,video/mp4" className="hidden" onChange={(e) => handleFileUpload(e, true)} disabled={uploading} />
                          {uploading ? "Uploading..." : "Select File"}
                        </label>
                        {newDoc.fileUrl && <span className="text-sm text-secondary break-all">{newDoc.fileUrl}</span>}
                      </div>
                    </div>
                  )}

                  <Textarea rows={14} placeholder="Extracted text" value={newDoc.extractedText} onChange={(e) => setNewDoc((c: any) => ({ ...c, extractedText: e.target.value }))} />
                  <label className="flex items-center gap-2 text-sm text-secondary"><input type="checkbox" checked={newDoc.active} onChange={(e) => setNewDoc((c: any) => ({ ...c, active: e.target.checked }))} />Active immediately</label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : showKnowledgeDocEditor && selectedDoc ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary">Selected document</div>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-primary md:text-4xl">{selectedDoc.title}</h2>
              <p className="mt-2 text-sm leading-6 text-secondary md:text-base">Refine metadata, adjust grounding text, and control whether this source is available to chatbot answers in one full-width document editor.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline">{selectedDoc.sourceType}</Badge>
                <Badge variant={selectedDoc.active ? "success" : "outline"}>{selectedDoc.active ? "Active" : "Inactive"}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setShowKnowledgeDocEditor(false)}>Back to library</Button>
              <Button onClick={saveDoc}>{getSaveButtonLabel("knowledge-doc-save", "Save document")}</Button>
            </div>
          </div>

          <Card className="border border-outline-variant/15 shadow-sm">
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Document snapshot</div>
                    <div className="mt-3 space-y-3 text-sm text-secondary">
                      <div className="rounded-xl bg-white p-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Source type</div>
                        <div className="mt-2 text-base font-semibold text-on-surface">{docDraft.sourceType.toUpperCase()}</div>
                      </div>
                      <div className="rounded-xl bg-white p-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Summary length</div>
                        <div className="mt-2 text-base font-semibold text-on-surface">{docDraft.summary.length} characters</div>
                      </div>
                      <div className="rounded-xl bg-white p-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">Availability</div>
                        <div className="mt-2 text-base font-semibold text-on-surface">{docDraft.active ? "Available to chatbot" : "Hidden from chatbot"}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2"><Input value={docDraft.title} onChange={(e) => setDocDraft((c: any) => ({ ...c, title: e.target.value }))} placeholder="Title" /><select className="h-11 rounded-xl bg-surface-container-high px-3 text-sm text-on-surface outline-none" value={docDraft.sourceType} onChange={(e) => setDocDraft((c: any) => ({ ...c, sourceType: e.target.value as typeof c.sourceType }))}><option value="text">Text</option><option value="pdf">PDF</option><option value="video">Video</option></select></div>
                  <Input value={docDraft.summary} onChange={(e) => setDocDraft((c: any) => ({ ...c, summary: e.target.value }))} placeholder="Summary" />
                  
                  {docDraft.sourceType !== "text" && (
                    <div className="rounded-xl border border-outline-variant/20 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary mb-2">Upload source file</div>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-outline-variant/20 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-fixed/30">
                          <input type="file" accept="application/pdf,video/mp4" className="hidden" onChange={(e) => handleFileUpload(e, false)} disabled={uploading} />
                          {uploading ? "Uploading..." : "Select File"}
                        </label>
                        {docDraft.fileUrl && <span className="text-sm text-secondary break-all">{docDraft.fileUrl}</span>}
                      </div>
                    </div>
                  )}

                  <Textarea rows={14} value={docDraft.extractedText} onChange={(e) => setDocDraft((c: any) => ({ ...c, extractedText: e.target.value }))} placeholder="Extracted text" />
                  <label className="flex items-center gap-2 text-sm text-secondary"><input type="checkbox" checked={docDraft.active} onChange={(e) => setDocDraft((c: any) => ({ ...c, active: e.target.checked }))} />Available to chatbot answers</label>
                  <div className="flex flex-wrap gap-3"><Button onClick={saveDoc}>{getSaveButtonLabel("knowledge-doc-save", "Save document")}</Button><Button variant="outline" onClick={() => selectedDoc ? setDocDraft({ title: selectedDoc.title, summary: selectedDoc.summary, extractedText: selectedDoc.extractedText, sourceType: selectedDoc.sourceType, active: selectedDoc.active }) : null}>Reset</Button></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 xl:max-w-xl xl:flex-1">
              <Card className="border border-outline-variant/15 shadow-sm"><CardContent className="p-4"><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Documents</div><div className="mt-2 text-3xl font-black tracking-tight text-primary">{data.knowledgeDocuments.length}</div></CardContent></Card>
              <Card className="border border-outline-variant/15 shadow-sm"><CardContent className="p-4"><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">Active</div><div className="mt-2 text-3xl font-black tracking-tight text-primary">{data.knowledgeDocuments.filter((doc: any) => doc.active).length}</div></CardContent></Card>
            </div>
            {currentUser.role === "admin" ? <div className="flex justify-end"><Button onClick={() => { setShowKnowledgeDocEditor(false); setShowAddKnowledgeDoc(true); }}>Add document</Button></div> : null}
          </div>

          <Card className="border border-outline-variant/15 shadow-sm">
            <CardHeader className="pb-4"><CardTitle>Document library</CardTitle><CardDescription>Open a source to edit its grounding text in a dedicated full-screen workspace.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {data.knowledgeDocuments.map((document: any) => (
                <button key={document.id} type="button" onClick={() => { setSelectedDocId(document.id); setShowKnowledgeDocEditor(true); }} className={cn("w-full rounded-2xl border p-4 text-left transition", selectedDoc?.id === document.id ? "border-primary/25 bg-primary-fixed/25 shadow-sm" : "border-outline-variant/15 bg-white hover:border-primary/15 hover:shadow-sm")}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0"><div className="truncate text-sm font-semibold text-on-surface">{document.title}</div><div className="mt-1 line-clamp-2 text-sm leading-6 text-secondary">{document.summary}</div></div>
                    <div className="flex flex-wrap gap-2"><Badge variant="outline">{document.sourceType}</Badge><Badge variant={document.active ? "success" : "outline"}>{document.active ? "Active" : "Inactive"}</Badge></div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
