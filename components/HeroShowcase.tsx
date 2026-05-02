"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { easeOutExpo, spring } from "@/lib/motion";
import type { HeroSlide, Product, SiteSection } from "@/lib/types";

function fallbackSlides(products: Product[], section?: SiteSection): HeroSlide[] {
  return products
    .map((product) => ({
      id: product.id,
      eyebrow: product.title,
      title: product.heroTitle || section?.title || product.title,
      summary: product.usp || section?.body || product.summary || product.title,
      imageUrl: product.heroImage ?? product.featuredImage ?? product.media[0] ?? "",
      imagePosition: product.heroImagePosition ?? "center center"
    }))
    .filter((s) => s.imageUrl);
}

function isRemoteAsset(path: string) {
  return /^https?:\/\//.test(path);
}

// Splits a title into words so we can stagger each one
function WordReveal({ text, className, animate }: { text: string; className?: string; animate: boolean }) {
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block mr-[0.22em] last:mr-0"
          // Skip initial animation on first paint to avoid SSR hydration flash
          initial={animate ? { opacity: 0, y: 28 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOutExpo, delay: animate ? 0.3 + i * 0.055 : 0 }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

export function HeroShowcase({
  products,
  section,
  ctaPrimary = "Talk to our expert",
  ctaSecondary = "Explore machines",
  ctaPrimaryHref = "#advisor",
  ctaSecondaryHref = "#machines"
}: {
  products: Product[];
  section?: SiteSection;
  ctaPrimary?: string;
  ctaSecondary?: string;
  ctaPrimaryHref?: string;
  ctaSecondaryHref?: string;
}) {
  const reduced = useReducedMotion();
  // Prevent opacity:0 flash during SSR — only animate after client hydration
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const slides = useMemo(() => {
    if (section?.slides?.length) return section.slides.filter((s) => s.imageUrl);
    if ((section?.imageUrl ?? "").trim()) {
      return [{
        id: "hero-override",
        eyebrow: section?.eyebrow || "Welden Industries",
        title: section?.title || products[0]?.title || "Welden Industries",
        summary: section?.body || products[0]?.summary || "",
        imageUrl: section?.imageUrl ?? "",
        imagePosition: "center center"
      }];
    }
    return fallbackSlides(products, section);
  }, [products, section]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((c) => (c + 1) % slides.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  const idx = activeIndex >= slides.length ? 0 : activeIndex;
  const activeSlide = slides[idx] ?? slides[0];

  return (
    <section id="top" className="relative overflow-hidden bg-[var(--color-forge)] pt-16">
      <div className="relative min-h-[calc(100svh-4rem)] lg:min-h-[56rem]">

        {/* ── Background images ─────────────────────────── */}
        <div className="absolute inset-0">
          <AnimatePresence mode="sync">
            {slides.map((slide, i) =>
              i === idx ? (
                <motion.div
                  key={slide.id}
                  className="absolute inset-0"
                  initial={mounted ? { opacity: 0, scale: reduced ? 1 : 1.04 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 1.2, ease: easeOutExpo }}
                >
                  <Image
                    src={slide.imageUrl}
                    alt={slide.title}
                    fill
                    priority={i === 0}
                    unoptimized={isRemoteAsset(slide.imageUrl)}
                    sizes="100vw"
                    className="h-full w-full object-cover"
                    style={{ objectPosition: slide.imagePosition ?? "center center" }}
                  />
                </motion.div>
              ) : null
            )}
          </AnimatePresence>
        </div>

        {/* ── Overlays ──────────────────────────────────── */}
        {/* Deep left-to-right gradient for text legibility */}
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(10,22,40,0.94)_0%,rgba(10,22,40,0.78)_36%,rgba(10,22,40,0.38)_64%,rgba(10,22,40,0.10)_100%)]" />
        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent_0%,rgba(10,22,40,0.6)_100%)]" />

        {/* ── Content ───────────────────────────────────── */}
        <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-screen-2xl flex-col justify-between px-6 py-10 lg:min-h-[56rem] lg:px-12 lg:py-16">
          <div />

          <div className="max-w-[48rem] pb-16 lg:pb-24">
            {/* Eyebrow */}
            <motion.div
              initial={mounted ? { opacity: 0, y: 12 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: easeOutExpo, delay: 0.1 }}
              key={`eyebrow-${idx}`}
            >
              <span className="eyebrow-dark">
                {activeSlide.eyebrow || section?.eyebrow || "Welden Industries"}
              </span>
            </motion.div>

            {/* Headline — word-by-word stagger */}
            <AnimatePresence mode="wait">
              <h1
                key={`title-${idx}`}
                className="mt-7 font-display text-[3rem] font-black leading-none tracking-[-0.05em] text-white sm:text-[4.2rem] lg:text-[5.6rem]"
              >
                <WordReveal text={activeSlide.title} animate={mounted} />
              </h1>
            </AnimatePresence>

            {/* Body copy */}
            <AnimatePresence mode="wait">
              <motion.p
                key={`body-${idx}`}
                initial={mounted ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.38, ease: easeOutExpo, delay: 0.52 }}
                className="mt-7 max-w-[34rem] text-[1.08rem] leading-[1.8] text-[var(--color-on-dark-dim)] sm:text-[1.18rem]"
              >
                {activeSlide.summary}
              </motion.p>
            </AnimatePresence>

            {/* CTA buttons */}
            <motion.div
              initial={mounted ? { opacity: 0, y: 12 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: easeOutExpo, delay: 0.68 }}
              className="mt-10 flex flex-wrap items-center gap-3"
            >
              <motion.a
                href={ctaPrimaryHref}
                className="btn-primary"
                whileHover={{ y: -2, boxShadow: "0 8px 32px rgba(245,158,11,0.5)" }}
                whileTap={{ scale: 0.97 }}
                transition={spring}
              >
                {ctaPrimary}
                <span className="ml-1 text-sm font-light opacity-80">→</span>
              </motion.a>
              <motion.a
                href={ctaSecondaryHref}
                className="btn-dark"
                whileHover={{ backgroundColor: "rgba(255,255,255,0.18)" }}
                whileTap={{ scale: 0.97 }}
                transition={spring}
              >
                {ctaSecondary}
              </motion.a>
            </motion.div>
          </div>

          {/* Slide indicators */}
          {slides.length > 1 ? (
            <motion.div
              initial={mounted ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.4 }}
              className="flex items-center gap-2.5 pb-2 lg:pb-0"
            >
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Show ${slide.title}`}
                  className="relative h-1 overflow-hidden rounded-full bg-white/20 transition-all duration-300"
                  style={{ width: i === idx ? "3rem" : "1rem" }}
                >
                  {i === idx ? (
                    <motion.span
                      className="absolute inset-0 origin-left rounded-full bg-[var(--color-arc)]"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 5.2, ease: "linear" }}
                    />
                  ) : null}
                </button>
              ))}
            </motion.div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
