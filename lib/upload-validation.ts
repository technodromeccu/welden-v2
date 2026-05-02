export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PRODUCT_BROCHURE_BYTES = 15 * 1024 * 1024;
export const MAX_QUOTATION_REFERENCE_BYTES = 10 * 1024 * 1024;
export const MAX_TICKET_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function formatMegabytes(bytes: number) {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

export function getUploadSizeError(file: File, label: string, maxBytes: number) {
  if (file.size === 0) {
    return `Empty ${label.toLowerCase()}`;
  }

  if (file.size > maxBytes) {
    return `${label} exceeds the ${formatMegabytes(maxBytes)} limit.`;
  }

  return null;
}
