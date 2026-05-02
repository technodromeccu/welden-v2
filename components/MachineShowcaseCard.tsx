"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { easeOutExpo, spring } from "@/lib/motion";
import type { Product } from "@/lib/types";

function isRemoteAsset(path?: string) {
  return !!path && /^https?:\/\//.test(path);
}

export function MachineShowcaseCard({ product, index }: { product: Product; index: number }) {
  const reduced = useReducedMotion();

  const image = product.featuredImage ?? product.media[0] ?? "";
  const quickSpecs = (product.specs ?? []).slice(0, 4);
  const detailHref = product.slug ? `/machines/${product.slug}` : null;

  return (
    <article
      id={`machine-${product.slug}`}
      className="scroll-mt-28 overflow-hidden rounded-[var(--radius-modal)] border border-[var(--color-border)]/50 bg-white shadow-[var(--shadow-float)] lg:grid lg:grid-cols-[minmax(0,0.58fr)_minmax(0,0.42fr)] lg:gap-0"
    >
      {/* ── Left — image + specs ─────────────────────────── */}
      <div className="flex flex-col overflow-hidden border-b border-[var(--color-border)]/40 lg:border-b-0 lg:border-r">

        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)]/40 bg-[var(--color-panel)] px-6 py-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-muted)]">
              Unit {String(index + 1).padStart(2, "0")}
            </div>
            <div className="mt-0.5 font-display text-lg font-black tracking-tight text-[var(--color-forge)]">
              {product.title}
            </div>
          </div>
          <span className="eyebrow-subtle">{product.category || "Industrial"}</span>
        </div>

        {/* Machine image */}
        {image ? (
          <div className="relative overflow-hidden bg-[var(--color-panel)]" style={{ aspectRatio: "16/9" }}>
            <motion.div
              className="relative h-full w-full"
              whileHover={{ scale: reduced ? 1 : 1.04 }}
              transition={{ duration: 0.7, ease: easeOutExpo }}
            >
              <Image
                src={image}
                alt={`${product.title} machine`}
                fill
                // First card is likely above the fold — prioritize it to avoid LCP penalty
                priority={index === 0}
                unoptimized={isRemoteAsset(image)}
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="object-cover"
              />
            </motion.div>
          </div>
        ) : null}

        {/* Quick specs */}
        <div className="flex-1 p-5">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">Key specifications</span>
            <span className="rounded-full bg-[var(--color-primary-fixed)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-iron)]">
              {quickSpecs.length} highlights
            </span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {quickSpecs.map((spec) => (
              <div
                key={`quick-${product.id}-${spec.label}`}
                className="rounded-[var(--radius-card)] border border-[var(--color-border)]/50 bg-[var(--color-surface)] px-4 py-4"
              >
                <div className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">{spec.label}</div>
                <div className="mt-1.5 text-sm font-semibold leading-5 text-[var(--color-forge)]">{spec.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA strip */}
        <div className="flex flex-wrap gap-2.5 border-t border-[var(--color-border)]/40 px-5 py-4">
          {detailHref ? (
            <motion.div whileHover={reduced ? {} : { y: -2 }} whileTap={{ scale: 0.97 }} transition={spring}>
              <Link href={detailHref} className="btn-primary py-2.5">
                View details
              </Link>
            </motion.div>
          ) : null}
          {product.brochureUrl ? (
            <motion.a
              href={product.brochureUrl}
              className="btn-secondary py-2.5"
              whileHover={reduced ? {} : { y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
            >
              Download brochure
            </motion.a>
          ) : null}
          <motion.a
            href="#advisor"
            className="btn-ghost border border-[var(--color-border)]/60 py-2.5"
            whileHover={reduced ? {} : { y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={spring}
          >
            Ask advisor
          </motion.a>
        </div>
      </div>

      {/* ── Right — description + capabilities + full specs ── */}
      <div className="flex flex-col justify-between p-6 lg:p-8">
        <div>
          {detailHref ? (
            <Link
              href={detailHref}
              className="font-display block text-4xl font-black tracking-[-0.04em] text-[var(--color-forge)] transition-colors hover:text-[var(--color-iron)] lg:text-[2.8rem]"
            >
              {product.title}
            </Link>
          ) : (
            <h2 className="font-display text-4xl font-black tracking-[-0.04em] text-[var(--color-forge)] lg:text-[2.8rem]">
              {product.title}
            </h2>
          )}
          <p className="mt-5 max-w-[34rem] text-base leading-[1.8] text-[var(--color-muted)]">
            {product.detailedDescription ?? product.summary}
          </p>
        </div>

        {(product.capabilities ?? []).length ? (
          <div className="mt-8">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">Core advantages</div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {(product.capabilities ?? []).slice(0, 4).map((cap) => (
                <div
                  key={cap}
                  className="flex items-center gap-2.5 rounded-[var(--radius-card)] border border-[var(--color-arc)]/12 bg-[var(--color-arc)]/5 px-4 py-3"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-arc)]" aria-hidden="true" />
                  <span className="text-sm font-medium leading-6 text-[var(--color-forge)]">{cap}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Full specs table */}
        <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)]/50">
          <div className="border-b border-[var(--color-border)]/40 bg-[var(--color-panel)] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Technical specifications
          </div>
          <div className="max-h-[260px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-surface)]">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">Parameter</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">Value</th>
                </tr>
              </thead>
              <tbody>
                {(product.specs ?? []).map((spec, i) => (
                  <tr
                    key={`${product.id}-${spec.label}`}
                    className={i % 2 === 0 ? "bg-white" : "bg-[var(--color-surface)]"}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-muted)]">{spec.label}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--color-forge)]">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </article>
  );
}
