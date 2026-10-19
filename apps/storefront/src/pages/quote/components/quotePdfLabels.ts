import type { LangFormatFunction } from '@/lib/lang';

const quotePdfTemplateLabelKeys = [
  'offer',
  'to',
  'customerCode',
  'contact',
  'description',
  'amount',
  'quantity',
  'packing',
  'unit',
  'delivery',
  'ready',
  'onRequest',
  'fromDate',
  'yourCode',
  'legend',
  'validity',
  'confirmation',
  'availability',
  'availabilityText',
  'quantities',
  'quantitiesText',
  'claims',
  'claimsText',
  'certificates',
  'origin',
  'cbam',
  'weight',
  'currency',
  'carriage',
  'payment',
  'packingTerms',
  'signature',
  'disclaimer',
] as const;

export type QuotePdfTemplateLabels = Record<(typeof quotePdfTemplateLabelKeys)[number], string>;

export function getQuotePdfTemplateLabels(translate: LangFormatFunction): QuotePdfTemplateLabels {
  return Object.fromEntries(
    quotePdfTemplateLabelKeys.map((key) => [key, translate(`quoteDraft.pdf.king.${key}`)]),
  ) as QuotePdfTemplateLabels;
}
