export interface PdfExtraField {
  fieldName: string;
  fieldValue: string;
}

export interface PdfVariantData {
  yourCode?: string;
  sku?: string;
  packaging: Record<string, string>;
  dimensions: Record<string, string>;
  stock: Record<string, string>;
}

export function pdfExtraField(
  fields: PdfExtraField[] | undefined,
  name: string,
): string | undefined {
  return fields?.find((field) => field.fieldName.trim() === name)?.fieldValue;
}

export function getQuotePdfCustomCode(
  value: string | undefined,
  companyId: string | undefined,
): string | undefined {
  const normalizedCompanyId = companyId?.trim();
  if (!value || !normalizedCompanyId) return undefined;

  // Same format as getCustomCodeForCompany in king-inox-bc-theme (dev).
  return value.split('|').reduce<string | undefined>((matched, entry) => {
    if (matched) return matched;
    const separator = entry.indexOf('=');
    if (separator === -1 || entry.slice(0, separator).trim() !== normalizedCompanyId) {
      return undefined;
    }
    return entry.slice(separator + 1).trim() || undefined;
  }, undefined);
}

export function quotePdfDelivery(
  stock: Record<string, string>,
  quantity: number,
): 'ready' | string | undefined {
  const onHand = stock.STOCK?.trim() ? Number(stock.STOCK) : NaN;
  const refill = stock.QTA_REFILL?.trim() ? Number(stock.QTA_REFILL) : NaN;
  if (Number.isFinite(onHand) && Number.isFinite(refill) && onHand <= 0 && refill <= 0) {
    return 'onRequest';
  }
  if (Number.isFinite(onHand) && onHand >= quantity) return 'ready';
  const date = stock.DATA_REFILL;
  if (
    Number.isFinite(onHand) &&
    Number.isFinite(refill) &&
    onHand + refill >= quantity &&
    date &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date)) &&
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date
  )
    return date;
  return undefined;
}
