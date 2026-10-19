import type {
  Content,
  ContentCanvas,
  ContentTable,
  ContentText,
  TableCell,
  TableCellProperties,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';

import type {
  BillingAddress,
  ContactInfo,
  QuoteExtraFields,
  ShippingAddress,
} from '@/types/quotes';

import { type PdfVariantData, quotePdfDelivery } from './quotePdfData';
import type { QuotePdfTemplateLabels } from './quotePdfLabels';
import { isNotesLabel, isYourCodeLabel } from './quoteProductOptions';
import type { PackagingByVariantId } from './useQuotePackagingMetafields';

export interface QuotePdfLine {
  id: string;
  articleCode: string;
  sku?: string;
  variantData?: PdfVariantData;
  productUrl?: string;
  dimensions: string[];
  yourCode?: string;
  packaging: string[];
  notes?: string;
  unitPrice: string;
  quantity: number;
  totalPrice: string;
}

export interface QuotePdfLabels {
  quote: string;
  draft: string;
  buyerInfo: string;
  quoteInfo: string;
  billing: string;
  shipping: string;
  title: string;
  reference: string;
  issuedOn?: string;
  expirationDate?: string;
  cc: string;
  products: string;
  product: string;
  price: string;
  quantity: string;
  total: string;
  noProducts: string;
  summary: string;
  subtotal: string;
  tax: string;
  grandTotal: string;
  page: string;
  of: string;
}

export interface QuotePdfSummary {
  subtotal: string;
  shipping: string;
  tax: string;
  grandTotal: string;
}

export interface QuotePdfData {
  storeName: string;
  templateLabels: QuotePdfTemplateLabels;
  locale: string;
  isDraft: boolean;
  quoteNumber?: string;
  customerCode?: string;
  salesRep?: { name?: string | null; email?: string | null; phone?: string | null };
  currencyCode?: string;
  commercialTerms?: { carriage?: string; payment?: string; packing?: string };
  logoUrl?: string;
  quoteTitle: string;
  referenceNumber: string;
  issuedAt?: string;
  expirationDate?: string;
  contactInfo: Partial<ContactInfo>;
  billingAddress: Partial<BillingAddress>;
  shippingAddress: Partial<ShippingAddress>;
  extraFields: QuoteExtraFields[];
  recipients: string[];
  lines: QuotePdfLine[];
  packagingByVariantId: PackagingByVariantId;
  summary: QuotePdfSummary;
  labels: QuotePdfLabels;
  filePrefix: string;
  draftLabel: string;
}

interface EmbeddedImages {
  logo?: string;
}

interface QuotePdfProductOption {
  label?: string;
  value?: string;
}

export const QUOTE_PDF_LOGO_URL = new URL(
  '../../../../../../public/images/logo-king-inox.png',
  import.meta.url,
).href;

const COLORS = {
  primary: '#2b3138',
  secondary: '#6b7278',
  border: '#e3e7eb',
  tableHeader: '#eef2f8',
  white: '#FFFFFF',
  accent: '#3f6aa0',
};

function displayValue(value: unknown): string {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim()))
    return '—';
  return String(value);
}

function formatPdfQuantity(value: string | number | undefined): string {
  const normalized = typeof value === 'number' ? String(value) : value?.trim();
  if (normalized && /^\d+$/.test(normalized)) {
    return new Intl.NumberFormat('it-IT', { useGrouping: true }).format(Number(normalized));
  }
  return displayValue(value);
}

function compactLines(values: unknown[]): string[] {
  return values
    .map((value) => (value === undefined || value === null ? '' : String(value).trim()))
    .filter(Boolean);
}

export function extractQuotePdfProductOptions(options: QuotePdfProductOption[]): {
  dimensions: string[];
  yourCode?: string;
  notes?: string;
} {
  const populatedOptions = options.flatMap(({ label, value }) => {
    const normalizedValue = value?.trim();

    return normalizedValue ? [{ label, value: normalizedValue }] : [];
  });
  const yourCode = populatedOptions.find(({ label }) => isYourCodeLabel(label))?.value;
  const notes = populatedOptions.find(({ label }) => isNotesLabel(label))?.value;
  const dimensions = populatedOptions
    .filter(({ label }) => !isYourCodeLabel(label) && !isNotesLabel(label))
    .map(({ value }) => value);

  return { dimensions, yourCode, notes };
}

export function resolveQuotePdfProductUrl(
  productUrl: string | undefined,
  storefrontOrigin: string,
): string | undefined {
  if (!productUrl) return undefined;

  try {
    const resolvedUrl = new URL(productUrl, storefrontOrigin);

    return ['http:', 'https:'].includes(resolvedUrl.protocol) ? resolvedUrl.href : undefined;
  } catch {
    return undefined;
  }
}

function formatPdfDate(value: string, locale: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function buildProductCell(line: QuotePdfLine, data: QuotePdfData): Content {
  const measure =
    line.variantData?.dimensions.MISURA?.trim() || compactLines(line.dimensions).join('X');
  return {
    stack: [
      {
        text: [
          { text: line.articleCode, ...(line.productUrl ? { link: line.productUrl } : {}) },
          ...(measure ? [{ text: ` - ${measure}` }] : []),
          ...(line.notes ? [{ text: ` - ${line.notes}` }] : []),
        ],
        bold: true,
      },
      {
        text: displayValue(line.variantData?.sku || line.sku),
        color: COLORS.accent,
        fontSize: 7,
        margin: [0, 2, 0, 0],
      },
      ...(line.yourCode
        ? [
            {
              text: `${data.templateLabels.yourCode}: ${line.yourCode}`,
              fontSize: 7,
              color: COLORS.secondary,
              margin: [0, 2, 0, 0],
            } as Content,
          ]
        : []),
    ],
  };
}

function buildProductsTable(data: QuotePdfData): ContentTable {
  const t = data.templateLabels;
  const header = (
    text: string,
    extra: Partial<ContentText & TableCellProperties> = {},
  ): TableCell => ({
    text,
    bold: true,
    color: COLORS.accent,
    fillColor: COLORS.tableHeader,
    ...extra,
  });
  const body: TableCell[][] = [
    [
      header(t.description, { rowSpan: 2 }),
      header(t.packing, { colSpan: 3, alignment: 'center' }),
      {},
      {},
      header(t.unit, { rowSpan: 2 }),
      header(t.quantity, { rowSpan: 2, alignment: 'right' }),
      header(data.labels.price, { rowSpan: 2, alignment: 'right' }),
      header(t.amount, { rowSpan: 2, alignment: 'right' }),
      header(t.delivery, { rowSpan: 2, alignment: 'center' }),
    ],
    [
      {},
      ...['Box', 'Bulk', 'Pallet'].map((text) => ({
        text,
        bold: true,
        fontSize: 7,
        alignment: 'center' as const,
        color: COLORS.white,
        fillColor: COLORS.accent,
      })),
      {},
      {},
      {},
      {},
      {},
    ],
  ];
  data.lines.forEach((line) => {
    const delivery = quotePdfDelivery(line.variantData?.stock || {}, line.quantity);
    let deliveryText = '—';
    if (delivery === 'onRequest') deliveryText = t.onRequest;
    else if (delivery === 'ready') deliveryText = t.ready;
    else if (delivery) {
      deliveryText = `${formatPdfQuantity(line.variantData?.stock.QTA_REFILL)} ${t.fromDate} ${formatPdfDate(delivery, data.locale)}`;
    }
    body.push([
      buildProductCell(line, data),
      ...['SCATOLA', 'MASTER_CARTON', 'PALLET'].map((key) => ({
        text: formatPdfQuantity(line.variantData?.packaging[key]),
        alignment: 'center' as const,
        fontSize: 7,
      })),
      { text: 'N.', alignment: 'center' },
      {
        text: formatPdfQuantity(line.quantity),
        alignment: 'right',
        bold: true,
      },
      { text: `${line.unitPrice} %`, alignment: 'right' },
      { text: line.totalPrice, alignment: 'right', bold: true },
      {
        text: deliveryText,
        alignment: 'center',
        color: COLORS.accent,
        fontSize: 7,
      },
    ]);
  });
  if (!data.lines.length)
    body.push([{ text: data.labels.noProducts, colSpan: 9 }, {}, {}, {}, {}, {}, {}, {}, {}]);
  return {
    margin: [0, 18, 0, 0],
    table: {
      headerRows: 2,
      dontBreakRows: true,
      keepWithHeaderRows: 1,
      widths: ['*', 29, 31, 34, 19, 42, 48, 49, 52],
      body,
    },
    layout: {
      hLineWidth: (index: number) => {
        if (index === 2) return 1;
        return index < 2 ? 0 : 0.4;
      },
      hLineColor: (index: number) => (index === 2 ? COLORS.accent : COLORS.border),
      vLineWidth: (index: number) => (index === 1 || index === 4 ? 0.5 : 0),
      vLineColor: () => COLORS.accent,
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
  };
}

export function buildQuotePdfDocument(
  data: QuotePdfData,
  images: EmbeddedImages = {},
): TDocumentDefinitions {
  const t = data.templateLabels;
  const address = data.billingAddress;
  const date = data.isDraft
    ? new Intl.DateTimeFormat(data.locale).format(new Date())
    : displayValue(data.issuedAt);
  const weightValues = data.lines.map((line) => {
    const raw = line.variantData?.dimensions.PESO?.trim();
    const weight = raw ? Number(raw.replace(',', '.')) : NaN;
    return Number.isFinite(weight) && weight >= 0 ? weight * line.quantity : NaN;
  });
  const totalWeight =
    weightValues.length && weightValues.every(Number.isFinite)
      ? `${new Intl.NumberFormat(data.locale, { maximumFractionDigits: 3 }).format(weightValues.reduce((sum, weight) => sum + weight, 0))} kg`
      : '—';
  const rule = (width: number, color: string, thickness: number): ContentCanvas => ({
    canvas: [
      { type: 'line', x1: 0, y1: 0, x2: width, y2: 0, lineWidth: thickness, lineColor: color },
    ],
  });
  const keyClause = (label: string, text: string): Content => ({
    columns: [
      {
        text: label.toLocaleUpperCase(data.locale),
        width: 80,
        bold: true,
        color: COLORS.accent,
        fontSize: 7,
      },
      { text, width: '*' },
    ],
    columnGap: 9,
    margin: [8, 4, 0, 0],
  });
  const term = (label: string, value?: string): Content => ({
    text: [{ text: `${label}: `, bold: true, color: COLORS.accent }, { text: displayValue(value) }],
    margin: [0, 3, 0, 0],
  });
  return {
    pageSize: 'A4',
    pageMargins: [40, 37, 40, 48],
    info: {
      title: data.quoteTitle || t.offer,
      subject: t.offer,
      author: 'KING S.p.A.',
      creator: 'KING S.p.A.',
    },
    defaultStyle: {
      font: data.locale.startsWith('zh') ? 'KingSansSC' : 'Roboto',
      fontSize: 8,
      color: COLORS.primary,
    },
    ...(data.isDraft
      ? {
          watermark: {
            text: data.labels.draft.toLocaleUpperCase(data.locale),
            color: COLORS.accent,
            opacity: 0.05,
            bold: true,
            angle: -24,
            fontSize: 100,
          },
        }
      : {}),
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: t.disclaimer, width: '*' },
        { text: `${currentPage} / ${pageCount}`, width: 40, alignment: 'right' },
      ],
      columnGap: 10,
      color: COLORS.secondary,
      fontSize: 6.5,
      margin: [40, 14, 40, 0],
    }),
    content: [
      {
        columns: [
          {
            width: 240,
            columns: [
              ...(images.logo
                ? [{ image: images.logo, fit: [85, 85] as [number, number], width: 88 }]
                : []),
              {
                stack: [
                  { text: 'KING', fontSize: 32, bold: true },
                  { text: 'Stainless steel fasteners', bold: true, fontSize: 8 },
                  {
                    text: 'www.king-inox.it',
                    color: COLORS.accent,
                    bold: true,
                    fontSize: 9,
                    margin: [0, 3, 0, 0],
                  },
                ],
              },
            ],
          },
          {
            width: '*',
            fontSize: 7,
            lineHeight: 1.35,
            columns: [
              {
                stack: [
                  { text: 'KING S.p.A.', bold: true },
                  'Via Abruzzo, 2',
                  '20073 OPERA - MI - ITALIA',
                  'Tel. +39 02 57606482',
                  'info@king-inox.it',
                ],
              },
              {
                stack: [
                  'Cap. Soc. 500.000 € i.v.',
                  'R.E.A. Milano 760791',
                  'P.IVA IT 00738100155',
                  'R.I. MI e C.F. 00738100155',
                  'SDI MZO2A0U',
                ],
              },
            ],
            columnGap: 10,
          },
        ],
        columnGap: 10,
        margin: [0, 0, 0, 12],
      },
      rule(515, COLORS.primary, 2),
      { ...rule(196, COLORS.accent, 2.6), margin: [0, 4, 0, 14] },
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                text: `OPERA, ${date}`,
                bold: true,
                color: COLORS.secondary,
                margin: [0, 0, 0, 10],
              },
              ...(!data.isDraft
                ? [
                    {
                      text: [
                        { text: `${t.offer} n. ` },
                        {
                          text: displayValue(data.quoteNumber),
                          bold: true,
                          fontSize: 15,
                          color: COLORS.accent,
                        },
                      ],
                    } as Content,
                  ]
                : []),
              ...(data.referenceNumber
                ? [
                    {
                      text: `${data.labels.reference.replace(/:\s*$/, '')}: ${data.referenceNumber}`,
                      margin: [0, 6, 0, 0],
                    } as Content,
                  ]
                : []),
              ...(!data.isDraft
                ? [
                    {
                      margin: [0, 8, 14, 0],
                      table: {
                        widths: ['*'],
                        body: [
                          [
                            {
                              fillColor: COLORS.tableHeader,
                              stack: [
                                {
                                  text: t.contact.toLocaleUpperCase(data.locale),
                                  fontSize: 6.5,
                                  bold: true,
                                  color: COLORS.accent,
                                },
                                {
                                  text: displayValue(data.salesRep?.name),
                                  bold: true,
                                  fontSize: 9,
                                  margin: [0, 2, 0, 0],
                                },
                                {
                                  text:
                                    compactLines([
                                      data.salesRep?.phone
                                        ? `Tel. ${data.salesRep.phone}`
                                        : undefined,
                                      data.salesRep?.email,
                                    ]).join(' · ') || '—',
                                  fontSize: 7,
                                  margin: [0, 2, 0, 0],
                                },
                              ],
                            },
                          ],
                        ],
                      },
                      layout: 'noBorders',
                    } as Content,
                  ]
                : []),
            ],
          },
          {
            width: 200,
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    border: [true, false, false, false],
                    stack: [
                      { text: t.to, bold: true, fontSize: 7, color: COLORS.accent },
                      {
                        text: displayValue(address.companyName || data.contactInfo.companyName),
                        fontSize: 12,
                        bold: true,
                        color: COLORS.accent,
                        margin: [0, 3, 0, 3],
                      },
                      ...compactLines([
                        address.address,
                        address.apartment,
                        compactLines([address.zipCode, address.city, address.state]).join(' '),
                        address.country,
                      ]).map((text): Content => ({ text, margin: [0, 1, 0, 0] })),
                      {
                        text: `${t.customerCode}: ${displayValue(data.customerCode)}`,
                        fontSize: 7,
                        margin: [0, 5, 0, 0],
                      },
                    ],
                  },
                ],
              ],
            },
            layout: { vLineColor: () => COLORS.accent, vLineWidth: () => 2, paddingLeft: () => 9 },
          },
        ],
        columnGap: 15,
      },
      buildProductsTable(data),
      {
        text: t.legend,
        alignment: 'right',
        fontSize: 7,
        color: COLORS.secondary,
        margin: [0, 5, 0, 16],
      },
      ...(!data.isDraft
        ? [
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      fillColor: COLORS.accent,
                      color: COLORS.white,
                      stack: [
                        { text: t.validity, bold: true },
                        { text: t.confirmation, fontSize: 7.5, margin: [0, 3, 0, 0] },
                      ],
                    },
                  ],
                ],
              },
              layout: {
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                paddingLeft: () => 9,
                paddingRight: () => 9,
                paddingTop: () => 2,
                paddingBottom: () => 2,
              },
            } as Content,
          ]
        : []),
      keyClause(t.availability, t.availabilityText),
      keyClause(t.quantities, t.quantitiesText),
      keyClause(t.claims, t.claimsText),
      { text: t.certificates, fontSize: 7, color: COLORS.secondary, margin: [0, 9, 0, 3] },
      { text: t.origin, fontSize: 7, color: COLORS.secondary, margin: [0, 0, 0, 7] },
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: COLORS.tableHeader,
                text: [
                  { text: 'CBAM Notice  ', bold: true, color: COLORS.accent },
                  { text: t.cbam },
                ],
                fontSize: 7,
              },
            ],
          ],
        },
        layout: {
          hLineColor: () => COLORS.accent,
          vLineColor: () => COLORS.accent,
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
        },
      },
      {
        unbreakable: true,
        margin: [0, 20, 0, 0],
        stack: [
          {
            columns: [
              { text: '', width: '*' },
              {
                width: 290,
                table: {
                  widths: [78, 64, '*'],
                  body: [
                    [
                      {
                        fillColor: '#c9ced4',
                        alignment: 'center',
                        stack: [
                          {
                            text: t.weight.toLocaleUpperCase(data.locale),
                            fontSize: 7,
                            bold: true,
                          },
                          { text: totalWeight, bold: true, fontSize: 11, margin: [0, 3, 0, 0] },
                        ],
                      },
                      {
                        fillColor: '#c9ced4',
                        alignment: 'center',
                        stack: [
                          {
                            text: t.currency.toLocaleUpperCase(data.locale),
                            fontSize: 7,
                            bold: true,
                          },
                          {
                            text: displayValue(data.currencyCode),
                            bold: true,
                            fontSize: 11,
                            margin: [0, 3, 0, 0],
                          },
                        ],
                      },
                      {
                        fillColor: COLORS.accent,
                        color: COLORS.white,
                        alignment: 'center',
                        stack: [
                          {
                            text: data.labels.total.toLocaleUpperCase(data.locale),
                            fontSize: 7,
                            bold: true,
                          },
                          {
                            text: data.summary.grandTotal.replace(
                              /(\d)[ \u00a0\u202f](?=\d{3}(?:\D|$))/g,
                              '$1.',
                            ),
                            bold: true,
                            fontSize: 15,
                            margin: [0, 3, 0, 0],
                          },
                        ],
                      },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: () => 0,
                  vLineWidth: () => 2,
                  vLineColor: () => COLORS.white,
                  paddingLeft: () => 8,
                  paddingRight: () => 8,
                  paddingTop: () => 6,
                  paddingBottom: () => 6,
                },
              },
            ],
          },
          { ...rule(515, COLORS.accent, 2), margin: [0, 15, 0, 9] },
          {
            columns: [
              {
                stack: [
                  term(t.carriage, data.commercialTerms?.carriage),
                  term(t.packingTerms, data.commercialTerms?.packing),
                ],
              },
              { stack: [term(t.payment, data.commercialTerms?.payment)] },
            ],
            columnGap: 22,
          },
          {
            text: `${t.signature}  ________________________________________`,
            margin: [0, 16, 0, 0],
            color: COLORS.secondary,
          },
        ],
      },
    ],
  };
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Unable to read image'));
    reader.readAsDataURL(blob);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to decode image'));
    image.src = url;
  });
}

export async function imageUrlToDataUrl(
  url: string | undefined,
  maxDimension = 480,
): Promise<string | undefined> {
  if (!url) return undefined;
  if (url.startsWith('data:image/png') || url.startsWith('data:image/jpeg')) return url;

  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const image = await loadImage(objectUrl);
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) return await readBlobAsDataUrl(blob);

      canvas.width = width;
      canvas.height = height;
      context.fillStyle = COLORS.white;
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      return canvas.toDataURL('image/jpeg', 0.88);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return undefined;
  }
}

export function buildQuotePdfFileName(quoteNumber?: string, date = new Date()): string {
  const safeNumber = (quoteNumber || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  return `${['Offerta', safeNumber, datePart].filter(Boolean).join('-')}.pdf`;
}

async function prepareEmbeddedImages(data: QuotePdfData): Promise<EmbeddedImages> {
  const logo = await imageUrlToDataUrl(data.logoUrl, 640);

  return {
    logo,
  };
}

type PdfMakeVirtualFileSystem = Record<string, string>;

function isPdfMakeVirtualFileSystem(value: unknown): value is PdfMakeVirtualFileSystem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'Roboto-Regular.ttf' in value &&
    typeof value['Roboto-Regular.ttf'] === 'string'
  );
}

export function resolvePdfMakeVirtualFileSystem(fontsModule: unknown): PdfMakeVirtualFileSystem {
  if (typeof fontsModule !== 'object' || fontsModule === null) {
    throw new Error('pdfmake virtual file system is unavailable');
  }

  const module = fontsModule as { default?: unknown; vfs?: unknown };
  const virtualFileSystem = [module.default, module.vfs, fontsModule].find(
    isPdfMakeVirtualFileSystem,
  );

  if (!virtualFileSystem) {
    throw new Error('pdfmake virtual file system is unavailable');
  }

  return virtualFileSystem;
}

async function createQuotePdf(data: QuotePdfData) {
  const [pdfMake, pdfFonts, images] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
    prepareEmbeddedImages(data),
  ]);
  const definition = buildQuotePdfDocument(data, images);
  const virtualFileSystem = { ...resolvePdfMakeVirtualFileSystem(pdfFonts) };
  if (data.locale.startsWith('zh')) {
    const response = await fetch(new URL('./fonts/KingSansSC.woff', import.meta.url).href);
    if (!response.ok) throw new Error('Quote PDF font unavailable');
    const fontData = await readBlobAsDataUrl(await response.blob());
    const [, base64Font] = fontData.split(',');
    virtualFileSystem['KingSansSC.woff'] = base64Font;
    return pdfMake.createPdf(
      definition,
      undefined,
      {
        KingSansSC: {
          normal: 'KingSansSC.woff',
          bold: 'KingSansSC.woff',
          italics: 'KingSansSC.woff',
          bolditalics: 'KingSansSC.woff',
        },
      },
      virtualFileSystem,
    );
  }
  return pdfMake.createPdf(definition, undefined, undefined, virtualFileSystem);
}

export async function downloadQuotePdf(data: QuotePdfData): Promise<void> {
  const pdf = await createQuotePdf(data);
  const fileName = buildQuotePdfFileName(data.quoteNumber);

  await new Promise<void>((resolve) => {
    pdf.download(fileName, resolve);
  });
}

export async function printQuotePdf(data: QuotePdfData, printWindow: Window): Promise<void> {
  const pdf = await createQuotePdf(data);

  pdf.print(undefined, printWindow);
}
