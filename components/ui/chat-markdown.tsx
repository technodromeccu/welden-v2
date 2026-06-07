import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Shared, dependency-free Markdown renderer for chat bubbles so the public advisor
// and the internal lead copilot format AI output identically. Renders React nodes
// (no dangerouslySetInnerHTML) and supports the subset the chatbots actually emit:
// headings, **bold**, *italic*, `code`, bullet/numbered lists, links, and line breaks.

type Tone = "light" | "dark";

const toneClasses: Record<Tone, { base: string; strong: string; heading: string; code: string; link: string }> = {
  light: {
    base: "text-slate-800",
    strong: "font-semibold text-slate-900",
    heading: "font-bold text-slate-900",
    code: "rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-800",
    link: "font-medium text-sky-700 underline underline-offset-2"
  },
  dark: {
    base: "text-[var(--color-on-dark)]",
    strong: "font-semibold text-white",
    heading: "font-bold text-white",
    code: "rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em] text-[var(--color-on-dark)]",
    link: "font-medium text-[var(--color-arc)] underline underline-offset-2"
  }
};

// Bold (**/__) is tried before italic (*/_) so it wins at the same position.
const INLINE = /\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*([^*]+)\*|_([^_]+)_/g;

function renderInline(text: string, tone: Tone, keyPrefix: string): ReactNode[] {
  const t = toneClasses[tone];
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  let match: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${i++}`;
    if (match[1] !== undefined || match[2] !== undefined) {
      out.push(<strong key={key} className={t.strong}>{match[1] ?? match[2]}</strong>);
    } else if (match[3] !== undefined) {
      out.push(<code key={key} className={t.code}>{match[3]}</code>);
    } else if (match[4] !== undefined && match[5] !== undefined) {
      out.push(<a key={key} href={match[5]} target="_blank" rel="noopener noreferrer" className={t.link}>{match[4]}</a>);
    } else if (match[6] !== undefined || match[7] !== undefined) {
      out.push(<em key={key}>{match[6] ?? match[7]}</em>);
    }
    last = INLINE.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { type: "h"; level: number; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "p"; lines: string[] };

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  const isUl = (l: string) => /^\s*[-*+]\s+/.test(l);
  const isOl = (l: string) => /^\s*\d+\.\s+/.test(l);
  const isH = (l: string) => /^#{1,6}\s+/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) { blocks.push({ type: "h", level: heading[1].length, text: heading[2] }); i++; continue; }

    if (isUl(line)) {
      const items: string[] = [];
      while (i < lines.length && isUl(lines[i])) { items.push(lines[i].replace(/^\s*[-*+]\s+/, "")); i++; }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (isOl(line)) {
      const items: string[] = [];
      while (i < lines.length && isOl(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, "")); i++; }
      blocks.push({ type: "ol", items });
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isUl(lines[i]) && !isOl(lines[i]) && !isH(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", lines: para });
  }

  return blocks;
}

export function ChatMarkdown({ content, tone = "light", className }: { content: string; tone?: Tone; className?: string }) {
  const t = toneClasses[tone];
  const blocks = parseBlocks(content ?? "");

  return (
    <div className={cn("space-y-2.5 break-words text-sm leading-7", t.base, className)}>
      {blocks.map((block, bi) => {
        if (block.type === "h") {
          return (
            <div key={`b-${bi}`} className={cn(t.heading, block.level <= 2 ? "text-[1.05em]" : "text-[0.98em]")}>
              {renderInline(block.text, tone, `h-${bi}`)}
            </div>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={`b-${bi}`} className="list-disc space-y-1 pl-5">
              {block.items.map((item, ii) => <li key={`li-${bi}-${ii}`}>{renderInline(item, tone, `ul-${bi}-${ii}`)}</li>)}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={`b-${bi}`} className="list-decimal space-y-1 pl-5">
              {block.items.map((item, ii) => <li key={`li-${bi}-${ii}`}>{renderInline(item, tone, `ol-${bi}-${ii}`)}</li>)}
            </ol>
          );
        }
        return (
          <p key={`b-${bi}`}>
            {block.lines.map((line, li) => (
              <Fragment key={`p-${bi}-${li}`}>
                {li > 0 ? <br /> : null}
                {renderInline(line, tone, `p-${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
