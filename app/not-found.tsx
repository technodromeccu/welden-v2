import Link from "next/link";

export const metadata = {
  title: "Page Not Found | Welden Industries",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-surface)] px-6 text-center">
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-forge)] text-xl font-black tracking-[0.16em] text-[var(--color-arc)]">
        W
      </div>

      <p className="eyebrow-subtle mb-4">404 — Page not found</p>

      <h1 className="font-display max-w-[16ch] text-4xl font-black tracking-[var(--tracking-display)] text-[var(--color-forge)] lg:text-5xl">
        This page doesn&apos;t exist.
      </h1>

      <p className="mt-5 max-w-md text-base leading-8 text-[var(--color-muted)]">
        The URL may have changed or the page was removed. Head back to the homepage to browse our machine lineup or get in touch.
      </p>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          Back to homepage
        </Link>
        <Link href="/#contact" className="btn-outline">
          Contact us
        </Link>
      </div>
    </div>
  );
}
