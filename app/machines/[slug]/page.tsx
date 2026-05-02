import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdvisorWidget } from "@/components/AdvisorWidget";
import { ConsultationForm } from "@/components/ConsultationForm";
import { MachinePageSurface } from "@/components/machines/MachineSurfaceRenderer";
import { buildMachinePageViewModel, getPublicProducts } from "@/lib/machine-page";
import { ensureSiteSections } from "@/lib/site-sections";
import { readCollection } from "@/lib/store";
import type { Product, SiteSection } from "@/lib/types";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function isVisibleAnchor(href: string, visibility: { machines: boolean; contact: boolean; advisor: boolean }) {
  switch (href.trim()) {
    case "#machines":
    case "/#machines":
      return visibility.machines;
    case "#contact":
    case "/#contact":
      return visibility.contact;
    case "#advisor":
    case "/#advisor":
      return visibility.advisor;
    default:
      return true;
  }
}

function absoluteAssetUrl(path?: string) {
  if (!path) return undefined;
  try {
    return new URL(path, siteUrl).toString();
  } catch {
    return undefined;
  }
}

async function getMachineDetail(slug: string) {
  const [products, rawSiteSections] = await Promise.all([
    readCollection<Product[]>("products"),
    readCollection<SiteSection[]>("site-sections")
  ]);
  const siteSections = ensureSiteSections(rawSiteSections);
  const liveProducts = getPublicProducts(products);
  const product = liveProducts.find((item) => item.slug === slug);
  const publishedSections = siteSections.filter((section) => section.published !== false);
  const sectionMap = Object.fromEntries(publishedSections.map((section) => [section.key, section]));

  return { product, liveProducts, sectionMap, publishedSections };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getMachineDetail(slug);

  if (!product) {
    return {
      title: "Machine Not Found | Welden Industries"
    };
  }

  const description = product.usp || product.summary || product.detailedDescription || product.title;
  const imageUrl = absoluteAssetUrl(product.heroImage ?? product.featuredImage ?? product.media[0]);

  return {
    title: `${product.title} | Welden Industries`,
    description,
    keywords: [product.title, product.category, ...(product.industries ?? []), ...(product.idealUseCases ?? [])],
    openGraph: {
      title: `${product.title} | Welden Industries`,
      description,
      type: "article",
      url: `${siteUrl}/machines/${product.slug}`,
      images: imageUrl ? [{ url: imageUrl, alt: `${product.title} industrial machine` }] : undefined
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: `${product.title} | Welden Industries`,
      description,
      images: imageUrl ? [imageUrl] : undefined
    }
  };
}

export default async function MachineDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, liveProducts, sectionMap, publishedSections } = await getMachineDetail(slug);

  if (!product) {
    notFound();
  }

  const footerSection = sectionMap.footer;
  const visibility = {
    machines: Boolean(sectionMap.machines || sectionMap.machine_cards),
    contact: Boolean(sectionMap.contact),
    advisor: Boolean(sectionMap.advisor)
  };
  const { machineCopy, footerLinks, gallery, specs, faqs } = buildMachinePageViewModel({
    product,
    liveProducts,
    siteSections: publishedSections
  });
  const visibleFooterLinks = footerLinks.filter((item) => isVisibleAnchor(item.href, visibility));
  const machinesHref = visibility.machines ? "/#machines" : "/";

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    category: product.category,
    description: product.detailedDescription || product.summary,
    brand: {
      "@type": "Brand",
      name: "Welden Industries"
    },
    manufacturer: {
      "@type": "Organization",
      name: "Welden Industries"
    },
    image: gallery.map((item) => absoluteAssetUrl(item)).filter(Boolean),
    url: `${siteUrl}/machines/${product.slug}`,
    additionalProperty: specs.map((spec) => ({
      "@type": "PropertyValue",
      name: spec.label,
      value: spec.value
    }))
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: visibility.machines ? "Machines" : "Homepage", item: `${siteUrl}${visibility.machines ? "/#machines" : "/"}` },
      { "@type": "ListItem", position: 3, name: product.title, item: `${siteUrl}/machines/${product.slug}` }
    ]
  };

  const faqJsonLd = faqs.length ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  } : null;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/35 bg-white/72 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-6 lg:px-12">
          <Link href="/" className="text-xl font-black uppercase tracking-tight text-primary">
            Welden Industries
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold tracking-tight text-secondary md:flex">
            {visibility.machines ? <Link href="/#machines" className="transition-colors hover:text-primary">Machines</Link> : null}
            {visibility.contact ? <Link href="/#contact" className="transition-colors hover:text-primary">Contact</Link> : null}
          </nav>

          {visibility.advisor ? (
            <a href="#advisor" className="btn-navy hidden py-2.5 md:inline-flex">
              AI Chatbot
            </a>
          ) : null}
        </div>
      </header>

      <main className="bg-surface pt-16 text-on-surface">
        <section className="bg-[linear-gradient(180deg,#eef4f8_0%,#ffffff_18%,#f8fbff_100%)] px-6 py-10 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-screen-2xl space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Link href={machinesHref} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-secondary transition hover:text-primary">
                  {machineCopy.back_link || "Back to machines"}
                </Link>
                <div className="mt-4 max-w-3xl text-sm leading-7 text-secondary">
                  This page is rendered from the same approved machine builder blocks used in the admin CMS preview.
                </div>
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-secondary shadow-sm">
                Machine detail page
              </div>
            </div>

            <MachinePageSurface
              product={product}
              liveProducts={liveProducts}
              siteSections={publishedSections}
              layout={product.machinePageLayout ?? []}
              mode="public"
              contactFormSlot={<ConsultationForm />}
            />
          </div>
        </section>
      </main>

      {footerSection ? (
        <footer className="border-t border-outline-variant/14 bg-white">
          <div className="mx-auto flex max-w-screen-2xl flex-col gap-5 px-6 py-8 text-sm text-secondary lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <div>
              &copy; {new Date().getFullYear()} {footerSection.title}. {footerSection.body}
            </div>
            <div className="flex flex-wrap gap-6 font-medium">
              {visibleFooterLinks.map((item) => (
                <a
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  className="transition-colors hover:text-primary"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </footer>
      ) : null}

      {visibility.advisor ? <AdvisorWidget products={liveProducts} /> : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
    </>
  );
}
