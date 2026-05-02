"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/types";

interface MachineSectionProps {
  product: Product;
  index: number;
}

function isRemoteAsset(path?: string) {
  return !!path && /^https?:\/\//.test(path);
}

export function MachineSection({ product, index }: MachineSectionProps) {
  const [activeTab, setActiveTab] = useState<"features" | "specs">("features");
  const imageSrc = product.featuredImage ?? product.media[0] ?? "";

  return (
    <article
      id={`machine-${product.slug}`}
      className={`product-panel ${index % 2 === 1 ? "product-panel--reverse" : ""}`}
    >
      <div className="product-panel__rail">
        <div className="product-panel__rail-meta">
          <span className="section-pill">{String(index + 1).padStart(2, "0")} / 04</span>
          <span className="product-panel__category">{product.category}</span>
        </div>
        <p className="product-panel__rail-usp">{product.usp ?? product.summary}</p>
      </div>

      <div className="product-panel__copy">
        <h2>{product.title}</h2>
        <p className="product-panel__summary">{product.summary}</p>

        <div className="product-tabs">
          <button
            className={`product-tab ${activeTab === "features" ? "is-active" : ""}`}
            onClick={() => setActiveTab("features")}
          >
            Capabilities
          </button>
          <button
            className={`product-tab ${activeTab === "specs" ? "is-active" : ""}`}
            onClick={() => setActiveTab("specs")}
          >
            Technical Specs
          </button>
        </div>

        <div className="product-tab-content">
          {activeTab === "features" ? (
            <div className="product-feature-list">
              {product.capabilities.map((capability) => (
                <div key={capability} className="product-feature-list__item">
                  <span className="product-feature-list__dot" />
                  <span>{capability}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="product-spec-card__scroll">
              <table className="product-spec-table">
                <tbody>
                  {product.specs?.map((spec) => (
                    <tr key={spec.label}>
                      <th>{spec.label}</th>
                      <td>{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="product-panel__actions">
          <a className="button-primary" href="#advisor">
            Chat with Welden AI
          </a>
          {product.brochureUrl && (
            <a className="button-secondary" href={product.brochureUrl}>
              Download Brochure
            </a>
          )}
        </div>
      </div>

      <div className="product-panel__visual">
        <div className="product-visual-unit">
          <div className="product-media-card">
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt={product.title}
                width={1200}
                height={900}
                unoptimized={isRemoteAsset(imageSrc)}
                sizes="(min-width: 1024px) 38vw, 100vw"
                className="product-media-card__image"
              />
            ) : null}
          </div>
          <div className="product-visual-context">
            <span className="eyebrow">Engineering Focus</span>
            <p>{product.detailedDescription?.split('.')[0]}.</p>
          </div>
        </div>
      </div>
    </article>
  );
}
