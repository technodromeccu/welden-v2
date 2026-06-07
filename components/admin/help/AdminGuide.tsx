"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { ChatMarkdown } from "@/components/ui/chat-markdown";
import { cn } from "@/lib/utils";
import { guideSections } from "./content";

export function AdminGuide({ currentUserRole }: { currentUserRole: string }) {
  const [activeId, setActiveId] = useState<string>(guideSections[0]?.id ?? "");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Scroll-spy: mark the section currently nearest the top of the viewport as active.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Prefer the topmost intersecting section to feel right while scrolling.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    for (const section of guideSections) {
      const node = sectionRefs.current[section.id];
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="sticky top-0 z-20 border-b border-outline-variant/15 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">Admin guide</div>
              <div className="text-base font-black tracking-tight text-primary">Welden Industries platform reference</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-surface-container-low px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-secondary md:inline-flex">
              Signed in as {currentUserRole}
            </span>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/15 bg-white px-4 py-2 text-xs font-semibold text-on-surface transition hover:border-outline-variant/30 hover:bg-surface-container-low"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to admin
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1 rounded-2xl border border-outline-variant/15 bg-white p-4">
            <div className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.2em] text-secondary">On this page</div>
            {guideSections.map((section) => {
              const active = activeId === section.id;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={cn(
                    "block rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-white"
                      : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
                  )}
                >
                  {section.title}
                </a>
              );
            })}
          </nav>
        </aside>

        <main className="space-y-12">
          {guideSections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              ref={(node) => { sectionRefs.current[section.id] = node; }}
              className="scroll-mt-24 rounded-3xl border border-outline-variant/15 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-low text-xs font-black text-secondary">
                  {index + 1}
                </span>
                <h2 className="text-2xl font-black tracking-tight text-primary">{section.title}</h2>
              </div>
              <ChatMarkdown
                content={section.content}
                tone="light"
                className="max-w-none text-sm leading-7"
              />
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
