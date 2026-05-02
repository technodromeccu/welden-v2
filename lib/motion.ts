import type { TargetAndTransition, Transition, Variants } from "framer-motion";

// ─── Easing curves ────────────────────────────────────────────────────────────
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeInExpo  = [0.7, 0, 0.84, 0] as const;

// ─── Spring presets ───────────────────────────────────────────────────────────
export const spring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
  mass: 0.8,
};

export const springBounce: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 24,
};

export const springGentle: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 28,
};

// ─── Base transitions ─────────────────────────────────────────────────────────
export const fastTransition: Transition  = { duration: 0.15, ease: easeOutExpo };
export const baseTransition: Transition  = { duration: 0.28, ease: easeOutExpo };
export const slowTransition: Transition  = { duration: 0.42, ease: easeOutExpo };
export const exitTransition: Transition  = { duration: 0.18, ease: easeInExpo };

// ─── Variants ─────────────────────────────────────────────────────────────────
export const fadeUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: baseTransition },
  exit:    { opacity: 0, y: -8, transition: exitTransition },
};

export const fadeDown: Variants = {
  initial: { opacity: 0, y: -12 },
  animate: { opacity: 1, y: 0, transition: baseTransition },
  exit:    { opacity: 0, y: 8, transition: exitTransition },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: fastTransition },
  exit:    { opacity: 0, transition: exitTransition },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1, transition: { ...spring } },
  exit:    { opacity: 0, scale: 0.96, transition: exitTransition },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: "100%" },
  animate: { opacity: 1, x: 0, transition: { ...springGentle } },
  exit:    { opacity: 0, x: "100%", transition: exitTransition },
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: "100%" },
  animate: { opacity: 1, y: 0, transition: { ...springGentle } },
  exit:    { opacity: 0, y: "100%", transition: exitTransition },
};

// ─── Stagger containers ───────────────────────────────────────────────────────
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.065, delayChildren: 0.05 } },
};

export const staggerFast: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.04 } },
};

// ─── Page transition ──────────────────────────────────────────────────────────
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: easeOutExpo } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.2,  ease: easeInExpo } },
};

// ─── Interactive states (for whileHover / whileTap) ───────────────────────────
export const hoverLift: TargetAndTransition    = { y: -5, transition: spring };
export const hoverLiftSm: TargetAndTransition  = { y: -3, transition: spring };
export const tapScale: TargetAndTransition     = { scale: 0.97 };
export const tapScaleSm: TargetAndTransition   = { scale: 0.985 };
