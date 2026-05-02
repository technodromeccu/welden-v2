"use client";

import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { spring } from "@/lib/motion";
import type { Product } from "@/lib/types";

function machineNavLabel(product: Product) {
  return product.shortName?.trim() || product.title;
}

export function SiteHeader({
  products,
  showMachines = true,
  showAbout = true,
  showContact = true,
  primaryCtaHref = "#contact"
}: {
  products: Product[];
  showMachines?: boolean;
  showAbout?: boolean;
  showContact?: boolean;
  primaryCtaHref?: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduced = useReducedMotion();
  const visiblePrimaryLinks = [
    { label: "Home", href: "/" },
    ...(showMachines ? [{ label: "Machines", href: "#machines" }] : []),
    ...(showAbout ? [{ label: "About", href: "/#about" }] : []),
    ...(showContact ? [{ label: "Contact", href: "/#contact" }] : []),
  ];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-[var(--color-border)]/30 bg-white/94 shadow-[var(--shadow-card)] backdrop-blur-lg"
          : "border-b border-transparent bg-transparent backdrop-blur-0"
      }`}
    >
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-12">

        {/* Logo */}
        <Link href="/" aria-label="Welden Industries home" className="flex min-w-0 items-center gap-3">
          <motion.span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-forge)] text-sm font-black tracking-[0.16em] text-[var(--color-arc)]"
            whileHover={reduced ? {} : { scale: 1.08 }}
            whileTap={{ scale: 0.96 }}
            transition={spring}
          >
            W
          </motion.span>
          <span className="flex min-w-0 flex-col">
            <span className="font-display truncate text-base font-black tracking-tight text-[var(--color-forge)] sm:text-lg">
              WELDEN INDUSTRIES
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-muted)]">
              Industrial Automation
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 text-sm font-semibold text-[var(--color-iron)] lg:flex" aria-label="Primary">
          <Link href="/" className="inline-flex items-center py-3 transition-colors hover:text-[var(--color-forge)]">Home</Link>

          {/* Machines dropdown */}
          {showMachines ? (
            <div className="group relative py-3">
              <a href="#machines" className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-forge)]">
                Machines
                <ChevronDown className="h-3 w-3 opacity-60" />
              </a>
              <div className="absolute left-0 top-full h-4 w-full" aria-hidden="true" />
              {products.slice(0, 4).length ? (
                <div className="pointer-events-none absolute left-0 top-full z-20 min-w-[18rem] rounded-[var(--radius-modal)] border border-[var(--color-border)]/20 bg-white p-3 opacity-0 shadow-[var(--shadow-float)] transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                  <div className="grid gap-1">
                    {products.slice(0, 4).map((product) => (
                      <a
                        key={product.id}
                        href={`/#machine-${product.slug}`}
                        className="rounded-[var(--radius-card)] px-3 py-3 text-sm font-semibold text-[var(--color-iron)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-forge)]"
                      >
                        {machineNavLabel(product)}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {showAbout ? <Link href="/#about" className="inline-flex items-center py-3 transition-colors hover:text-[var(--color-forge)]">About</Link> : null}
          {showContact ? <Link href="/#contact" className="inline-flex items-center py-3 transition-colors hover:text-[var(--color-forge)]">Contact</Link> : null}
        </nav>

        <div className="flex items-center gap-2">
          {primaryCtaHref ? (
            <motion.a
              href={primaryCtaHref}
              className="btn-primary hidden py-2.5 sm:inline-flex"
              whileHover={reduced ? {} : { y: -2, boxShadow: "0 8px 24px rgba(245,158,11,0.45)" }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
            >
              Request Quote
            </motion.a>
          ) : null}

          <motion.button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-site-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)]/30 bg-white text-[var(--color-forge)] shadow-sm transition hover:bg-[var(--color-panel)] lg:hidden"
            whileTap={{ scale: 0.93 }}
            transition={spring}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={mobileOpen ? "close" : "open"}
                initial={{ rotate: -45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 45, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-site-nav"
            key="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-[var(--color-border)]/20 bg-white lg:hidden"
          >
            <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:px-6">
              <div className="grid gap-1.5 rounded-[var(--radius-modal)] border border-[var(--color-border)]/20 bg-[var(--color-surface)] p-3 shadow-[var(--shadow-float)]">
                {visiblePrimaryLinks.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.045, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-[var(--radius-card)] px-4 py-3 text-sm font-semibold text-[var(--color-iron)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-forge)]"
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
                {showMachines && products.slice(0, 4).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.18 }}
                    className="px-4 pt-2 pb-1"
                  >
                    <span className="text-xs font-bold uppercase tracking-[var(--tracking-eyebrow)] text-[var(--color-muted)]">
                      Machine lineup
                    </span>
                  </motion.div>
                )}
                {products.slice(0, 4).map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (5 + i) * 0.045, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <a
                      href={`/#machine-${product.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-[var(--radius-card)] bg-[var(--color-panel)] px-4 py-3 text-sm font-semibold text-[var(--color-iron)] transition hover:text-[var(--color-forge)]"
                    >
                      {machineNavLabel(product)}
                    </a>
                  </motion.div>
                ))}
                {primaryCtaHref ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32, duration: 0.22 }}
                    className="mt-2"
                  >
                    <a
                      href={primaryCtaHref}
                      onClick={() => setMobileOpen(false)}
                      className="btn-primary block text-center"
                    >
                      Request Quote
                    </a>
                  </motion.div>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
