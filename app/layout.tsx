import "./globals.css";
import type { Metadata } from "next";
import { Inter, DM_Sans, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap"
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://weldenindustries.com";

export const metadata: Metadata = {
  title: "Welden Industries | Precision Automated Machinery",
  description: "Welden Industries delivers high-performance machinery engineered for the most demanding industrial environments.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    siteName: "Welden Industries",
    title: "Welden Industries | Precision Automated Machinery",
    description: "Automated machines for pipe cutting, idler welding, double end boring, and bearing pushing. Built for repeatable industrial output.",
    url: siteUrl,
    images: [
      {
        url: "/images/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Welden Industries — Precision Automated Machinery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Welden Industries | Precision Automated Machinery",
    description: "Automated machines for pipe cutting, idler welding, double end boring, and bearing pushing.",
    images: ["/images/og-default.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${dmSans.variable} ${jetbrainsMono.variable} bg-[var(--color-surface)] text-[var(--color-forge)] font-sans selection:bg-[var(--color-arc)] selection:text-[var(--color-forge)] antialiased`}>
        {children}
      </body>
    </html>
  );
}
