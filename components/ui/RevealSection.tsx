"use client";

// RevealSection / RevealItem — lightweight scroll-reveal wrappers.
// These are plain passthrough divs while we stabilise the layout.
// Re-add Framer Motion animation after confirming all content renders correctly.

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function RevealSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function RevealItem({ children, className }: RevealProps) {
  return <div className={className}>{children}</div>;
}
