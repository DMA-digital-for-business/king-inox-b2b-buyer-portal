import type {
  Column,
  Content,
  ContentStack,
  ContentTable,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';

import type {
  BillingAddress,
  ContactInfo,
  QuoteExtraFields,
  ShippingAddress,
} from '@/types/quotes';

import { isNotesLabel, isYourCodeLabel } from './quoteProductOptions';
import type { PackagingByVariantId } from './useQuotePackagingMetafields';

export interface QuotePdfLine {
  id: string;
  articleCode: string;
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
  primary: '#263238',
  secondary: '#607D8B',
  border: '#D9DCE9',
  tableHeader: '#ECEFF1',
  white: '#FFFFFF',
};

function displayValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

function labeledValue(label: string, value: string): string {
  return `${label.replace(/:\s*$/, '')}: ${value}`;
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

function addressLines(address: Partial<BillingAddress> | Partial<ShippingAddress>): string[] {
  const fullName = compactLines([address.firstName, address.lastName]).join(' ');
  const cityLine = compactLines([address.zipCode, address.city, address.state]).join(', ');

  return compactLines([
    address.label,
    fullName,
    address.companyName,
    address.address,
    address.apartment,
    cityLine,
    address.country,
    address.phoneNumber,
  ]);
}

function section(title: string, lines: string[]): ContentStack {
  return {
    stack: [
      { text: title, style: 'sectionTitle' },
      ...(lines.length ? lines : ['-']).map((text) => ({ text, style: 'detailLine' })),
    ],
    margin: [0, 0, 10, 0],
  };
}

function buildProductCell(line: QuotePdfLine): Content {
  const dimensions = compactLines(line.dimensions).join('X');
  const productDetails = [
    {
      text: line.articleCode,
      ...(line.productUrl ? { link: line.productUrl } : {}),
    },
    ...(dimensions ? [{ text: ` - ${dimensions}` }] : []),
    ...(line.notes ? [{ text: ` - ${line.notes}` }] : []),
  ];
  const packaging = compactLines(line.packaging).join('; ');
  const details: Content[] = [
    { text: productDetails, bold: true, color: COLORS.primary, fontSize: 9 },
    ...(line.yourCode
      ? [
          {
            text: `Il vostro codice: ${line.yourCode}`,
            color: COLORS.primary,
            fontSize: 9,
            margin: [0, 2, 0, 0],
          } as Content,
        ]
      : []),
    ...(packaging
      ? [
          {
            text: packaging,
            color: COLORS.secondary,
            fontSize: 8,
            lineHeight: 1.15,
            margin: [0, 2, 0, 0],
          } as Content,
        ]
      : []),
  ];

  return { stack: details };
}

function buildProductsTable(data: QuotePdfData): ContentTable {
  const { labels } = data;
  const header: TableCell[] = [
    { text: labels.product, style: 'tableHeader' },
    { text: labels.price, style: 'tableHeader', alignment: 'right' },
    { text: labels.quantity, style: 'tableHeader', alignment: 'right' },
    { text: labels.total, style: 'tableHeader', alignment: 'right' },
  ];

  const body: TableCell[][] = [header];

  if (!data.lines.length) {
    body.push([{ text: labels.noProducts, colSpan: 4, margin: [0, 8] }, {}, {}, {}]);
  } else {
    data.lines.forEach((line) => {
      body.push([
        buildProductCell(line),
        { text: line.unitPrice, alignment: 'right', margin: [0, 4, 0, 0] },
        { text: String(line.quantity), alignment: 'right', margin: [0, 4, 0, 0] },
        { text: line.totalPrice, alignment: 'right', bold: true, margin: [0, 4, 0, 0] },
      ]);
    });
  }

  return {
    table: {
      headerRows: 1,
      dontBreakRows: true,
      keepWithHeaderRows: 1,
      widths: ['*', 72, 42, 72],
      body,
    },
    layout: {
      fillColor: (rowIndex: number) => (rowIndex === 0 ? COLORS.tableHeader : null),
      hLineColor: () => COLORS.border,
      vLineColor: () => COLORS.border,
      paddingLeft: () => 7,
      paddingRight: () => 7,
      paddingTop: () => 7,
      paddingBottom: () => 7,
    },
  };
}

export function buildQuotePdfDocument(
  data: QuotePdfData,
  images: EmbeddedImages = {},
): TDocumentDefinitions {
  const { labels } = data;
  const quoteInfoLines = [
    `${labels.title}: ${displayValue(data.quoteTitle)}`,
    `${labels.reference}: ${displayValue(data.referenceNumber)}`,
    ...(data.issuedAt && labels.issuedOn ? [labeledValue(labels.issuedOn, data.issuedAt)] : []),
    ...(data.expirationDate && labels.expirationDate
      ? [labeledValue(labels.expirationDate, data.expirationDate)]
      : []),
    ...data.recipients.map((recipient) => `${labels.cc}: ${recipient}`),
    ...data.extraFields.map(
      (field) => `${displayValue(field.fieldName)}: ${displayValue(field.value)}`,
    ),
  ];
  const buyerLines = compactLines([
    data.contactInfo.name,
    data.contactInfo.companyName,
    data.contactInfo.email,
    data.contactInfo.phoneNumber,
  ]);

  const logo = (
    images.logo
      ? { image: images.logo, fit: [150, 55], alignment: 'left', width: '*' as const }
      : { text: displayValue(data.storeName), style: 'storeName', width: '*' as const }
  ) as Column;
  const buyerSection: Column = { ...section(labels.buyerInfo, buyerLines), width: '*' };
  const quoteSection: Column = { ...section(labels.quoteInfo, quoteInfoLines), width: '*' };
  const billingSection: Column = {
    ...section(labels.billing, addressLines(data.billingAddress)),
    width: '*',
  };
  const shippingSection: Column = {
    ...section(labels.shipping, addressLines(data.shippingAddress)),
    width: '*',
  };

  return {
    pageSize: 'A4',
    pageMargins: [36, 40, 36, 46],
    info: {
      title: data.quoteTitle || labels.quote,
      subject: labels.quote,
      author: data.storeName,
      creator: data.storeName,
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 9,
      color: COLORS.primary,
    },
    background: {
      canvas: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          w: 595.28,
          h: 841.89,
          color: COLORS.white,
        },
      ],
    },
    footer: (currentPage, pageCount) => ({
      text: `${labels.page} ${currentPage} ${labels.of} ${pageCount}`,
      alignment: 'center',
      color: COLORS.secondary,
      fontSize: 8,
      margin: [0, 14, 0, 0],
    }),
    styles: {
      storeName: { fontSize: 18, bold: true, color: COLORS.primary },
      documentTitle: { fontSize: 22, bold: true, color: COLORS.primary },
      draft: { fontSize: 10, bold: true, color: COLORS.secondary },
      sectionHeading: { fontSize: 14, bold: true, color: COLORS.primary },
      sectionTitle: { fontSize: 10, bold: true, color: COLORS.secondary, margin: [0, 0, 0, 5] },
      detailLine: { fontSize: 9, margin: [0, 1, 0, 0] },
      tableHeader: { fontSize: 9, bold: true, color: COLORS.primary },
      summaryLabel: { fontSize: 9, color: COLORS.secondary },
      summaryValue: { fontSize: 9, alignment: 'right' },
      summaryTotal: { fontSize: 11, bold: true, alignment: 'right' },
    },
    content: [
      {
        columns: [
          logo,
          {
            width: 180,
            alignment: 'right',
            stack: [
              { text: labels.quote, style: 'documentTitle' },
              { text: data.draftLabel || labels.draft, style: 'draft', margin: [0, 4, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 0, 22],
      },
      {
        columns: [buyerSection, quoteSection],
        columnGap: 14,
        margin: [0, 0, 0, 18],
      },
      {
        columns: [billingSection, shippingSection],
        columnGap: 14,
        margin: [0, 0, 0, 22],
      },
      { text: labels.products, style: 'sectionHeading', margin: [0, 0, 0, 9] },
      buildProductsTable(data),
      {
        columns: [
          { text: '', width: '*' },
          {
            width: 220,
            margin: [0, 20, 0, 0],
            table: {
              widths: ['*', 85],
              body: [
                [{ text: labels.summary, bold: true, colSpan: 2, margin: [0, 2, 0, 6] }, {}],
                [
                  { text: labels.subtotal, style: 'summaryLabel' },
                  { text: data.summary.subtotal, style: 'summaryValue' },
                ],
                [
                  { text: labels.shipping, style: 'summaryLabel' },
                  { text: data.summary.shipping, style: 'summaryValue' },
                ],
                [
                  { text: labels.tax, style: 'summaryLabel' },
                  { text: data.summary.tax, style: 'summaryValue' },
                ],
                [
                  { text: labels.grandTotal, bold: true, margin: [0, 6, 0, 0] },
                  { text: data.summary.grandTotal, style: 'summaryTotal', margin: [0, 6, 0, 0] },
                ],
              ],
            },
            layout: 'noBorders',
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

export function buildQuotePdfFileName(
  prefix: string,
  referenceOrTitle: string,
  date = new Date(),
): string {
  const normalizedPrefix = prefix.trim() || 'quote';
  const identifier = referenceOrTitle.trim() || 'draft';
  const safeIdentifier =
    identifier
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'draft';
  const datePart = date.toISOString().slice(0, 10);

  return `${normalizedPrefix}-${safeIdentifier}-${datePart}.pdf`;
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
  const virtualFileSystem = resolvePdfMakeVirtualFileSystem(pdfFonts);

  return pdfMake.createPdf(definition, undefined, undefined, virtualFileSystem);
}

export async function downloadQuotePdf(data: QuotePdfData): Promise<void> {
  const pdf = await createQuotePdf(data);
  const fileName = buildQuotePdfFileName(data.filePrefix, data.referenceNumber || data.quoteTitle);

  await new Promise<void>((resolve) => {
    pdf.download(fileName, resolve);
  });
}

export async function printQuotePdf(data: QuotePdfData, printWindow: Window): Promise<void> {
  const pdf = await createQuotePdf(data);

  pdf.print(undefined, printWindow);
}
