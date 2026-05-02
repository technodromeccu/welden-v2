"use client";

import { useCallback } from "react";

export function useProductUploads(api: (url: string, options?: RequestInit) => Promise<Response>) {
  const uploadMediaImage = useCallback(async (file: File, folderHint: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folderHint", folderHint);
    const response = await api("/api/uploads/product-image", { method: "POST", body: formData });
    const payload = await response.json() as { url: string };
    return payload.url;
  }, [api]);

  const uploadBrandingImage = useCallback(async (file: File, assetName: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("assetName", assetName);
    const response = await api("/api/uploads/branding-image", { method: "POST", body: formData });
    const payload = await response.json() as { url: string };
    return payload.url;
  }, [api]);

  const uploadProductBrochure = useCallback(async (file: File, productSlug: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("productSlug", productSlug);
    const response = await api("/api/uploads/product-brochure", { method: "POST", body: formData });
    const payload = await response.json() as { url: string };
    return payload.url;
  }, [api]);

  return { uploadMediaImage, uploadBrandingImage, uploadProductBrochure };
}
