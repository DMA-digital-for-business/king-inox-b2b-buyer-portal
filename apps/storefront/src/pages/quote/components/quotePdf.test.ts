import { builder, faker } from 'tests/test-utils';

import en from '@/lib/lang/locales/en.json';

import {
  buildQuotePdfDocument,
  buildQuotePdfFileName,
  extractQuotePdfProductOptions,
  imageUrlToDataUrl,
  QuotePdfData,
  resolvePdfMakeVirtualFileSystem,
  resolveQuotePdfProductUrl,
} from './quotePdf';
import { getQuotePdfTemplateLabels } from './quotePdfLabels';

const buildLabelsWith = builder<QuotePdfData['labels']>(() => ({
  quote: faker.lorem.word(),
  draft: faker.lorem.word(),
  buyerInfo: faker.lorem.words(),
  quoteInfo: faker.lorem.words(),
  billing: faker.lorem.word(),
  shipping: faker.lorem.word(),
  title: faker.lorem.word(),
  reference: faker.lorem.word(),
  cc: faker.lorem.word(),
  products: faker.lorem.words(),
  product: faker.lorem.word(),
  price: faker.lorem.word(),
  quantity: faker.lorem.word(),
  total: faker.lorem.word(),
  noProducts: faker.lorem.words(),
  summary: faker.lorem.word(),
  subtotal: faker.lorem.word(),
  tax: faker.lorem.word(),
  grandTotal: faker.lorem.words(),
  page: faker.lorem.word(),
  of: faker.lorem.word(),
}));

const buildQuotePdfDataWith = builder<QuotePdfData>(() => ({
  templateLabels: getQuotePdfTemplateLabels((id) => en[id as keyof typeof en]),
  locale: 'en',
  isDraft: false,
  storeName: faker.company.name(),
  logoUrl: faker.image.url(),
  quoteTitle: faker.commerce.productName(),
  referenceNumber: faker.string.alphanumeric(),
  contactInfo: {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    companyName: faker.company.name(),
    phoneNumber: faker.phone.number(),
  },
  billingAddress: {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    country: faker.location.country(),
    zipCode: faker.location.zipCode(),
  },
  shippingAddress: {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    country: faker.location.country(),
    zipCode: faker.location.zipCode(),
  },
  extraFields: [{ fieldName: faker.lorem.word(), value: faker.lorem.words() }],
  recipients: [faker.internet.email()],
  lines: [
    {
      id: faker.string.uuid(),
      articleCode: faker.string.alphanumeric(),
      productUrl: faker.internet.url(),
      dimensions: [faker.number.int().toString(), faker.number.int().toString()],
      yourCode: faker.string.alphanumeric(),
      packaging: [
        `Box: ${faker.number.int()}`,
        `Mastercarton: ${faker.number.int()}`,
        `Pallet: ${faker.number.int()}`,
      ],
      notes: faker.lorem.sentence(),
      unitPrice: faker.commerce.price(),
      quantity: faker.number.int({ min: 1, max: 100 }),
      totalPrice: faker.commerce.price(),
    },
  ],
  packagingByVariantId: {},
  summary: {
    subtotal: faker.commerce.price(),
    shipping: faker.lorem.word(),
    tax: faker.commerce.price(),
    grandTotal: faker.commerce.price(),
  },
  labels: buildLabelsWith('WHATEVER_VALUES'),
  filePrefix: faker.lorem.word(),
  draftLabel: faker.lorem.word(),
}));

describe('quote PDF document', () => {
  it('resolves the bundled Roboto fonts from dynamically imported and named modules', async () => {
    const [pdfMake, fontsModule] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ]);
    const virtualFileSystem = resolvePdfMakeVirtualFileSystem(fontsModule);

    expect(Object.keys(virtualFileSystem)).toEqual([
      'Roboto-Italic.ttf',
      'Roboto-Medium.ttf',
      'Roboto-MediumItalic.ttf',
      'Roboto-Regular.ttf',
    ]);
    expect(resolvePdfMakeVirtualFileSystem({ vfs: virtualFileSystem })).toBe(virtualFileSystem);

    const pdfLength = await new Promise<number>((resolve) => {
      pdfMake
        .createPdf({ content: [faker.lorem.sentence()] }, undefined, undefined, virtualFileSystem)
        .getBuffer((buffer) => resolve(buffer.length));
    });

    expect(pdfLength).toBeGreaterThan(0);
  });

  it('renders KING branding, billing recipient and only the final quote total', () => {
    const data = buildQuotePdfDataWith('WHATEVER_VALUES');
    const document = buildQuotePdfDocument(data);
    const text = JSON.stringify(document.content);
    expect(text).toContain('KING S.p.A.');
    expect(text).toContain(data.billingAddress.address);
    expect(text).not.toContain(data.shippingAddress.address);
    expect(text).toContain(data.summary.grandTotal);
    expect(text).not.toContain(`"text":${JSON.stringify(data.labels.tax)}`);
    expect(text).toContain(data.lines[0].yourCode);
    expect(text).toContain(data.lines[0].productUrl);
    expect(text).toContain(data.templateLabels.validity);
    expect(text).toContain('Matteo Cha');
    expect(document.watermark).toBeUndefined();
  });

  it('renders a draft watermark without contact or validity', () => {
    const data = buildQuotePdfDataWith({ isDraft: true });
    const document = buildQuotePdfDocument(data);
    const text = JSON.stringify(document.content);
    expect(text).not.toContain('Matteo Cha');
    expect(text).not.toContain(data.templateLabels.validity);
    expect(text).not.toContain(data.labels.draft.toUpperCase());
    expect(text).not.toContain(`${data.templateLabels.offer} n. `);
    expect(document.watermark).toEqual(
      expect.objectContaining({ text: data.labels.draft.toUpperCase() }),
    );
    expect(text).toContain(data.templateLabels.cbam);
  });

  it('uses the quote number separately from the customer reference and does not invent an issue date', () => {
    const number = faker.string.numeric();
    const data = buildQuotePdfDataWith({ quoteNumber: number, issuedAt: undefined });
    const text = JSON.stringify(buildQuotePdfDocument(data).content);
    expect(text).toContain(number);
    expect(text).toContain(data.referenceNumber);
    expect(text).toContain('OPERA, —');
  });

  it('prefers variant measure and includes packaging, delivery and total weight', () => {
    const data = buildQuotePdfDataWith('WHATEVER_VALUES');
    const measure = faker.string.alphanumeric();
    const sku = faker.string.alphanumeric();
    data.lines[0] = {
      ...data.lines[0],
      quantity: 20,
      variantData: {
        sku,
        dimensions: { MISURA: measure, PESO: '0.5' },
        packaging: { SCATOLA: '100', MASTER_CARTON: '1000', PALLET: '32000' },
        stock: { STOCK: '20' },
      },
    };
    const text = JSON.stringify(buildQuotePdfDocument(data).content);
    expect(text).toContain(measure);
    expect(text).toContain(sku);
    expect(text).not.toContain(data.lines[0].dimensions.join('X'));
    expect(text).toContain('32.000');
    expect(text).toContain('1.000');
    expect(text).toContain(data.templateLabels.ready);
    expect(text).toContain('10 kg');
  });

  it('does not report a partial weight when one variant weight is missing', () => {
    const data = buildQuotePdfDataWith('WHATEVER_VALUES');
    data.lines.push({
      ...data.lines[0],
      variantData: { packaging: {}, stock: {}, dimensions: { PESO: '1' } },
    });
    const text = JSON.stringify(buildQuotePdfDocument(data).content);
    expect(text).not.toContain(' kg');
    expect(text).toContain('—');
  });

  it('formats quantities with Italian thousands separators regardless of the portal language', () => {
    const data = buildQuotePdfDataWith({ locale: 'en' });
    data.lines[0] = { ...data.lines[0], quantity: 32000 };
    const text = JSON.stringify(buildQuotePdfDocument(data).content);
    expect(text).toContain('"text":"32.000","alignment":"right","bold":true');
  });

  it('renders the translated on-request delivery label for unavailable items', () => {
    const data = buildQuotePdfDataWith('WHATEVER_VALUES');
    data.lines[0] = {
      ...data.lines[0],
      variantData: { packaging: {}, dimensions: {}, stock: { STOCK: '0', QTA_REFILL: '0' } },
    };
    const text = JSON.stringify(buildQuotePdfDocument(data).content);
    expect(text).toContain(data.templateLabels.onRequest);
    expect(text).not.toContain('"text":"onRequest"');
  });

  it.each([' ', '\u00a0', '\u202f'])(
    'uses dots instead of %j as thousands separators in the total',
    (separator) => {
      const data = buildQuotePdfDataWith({
        summary: { grandTotal: `€1${separator}002${separator}345,45` },
      });
      const text = JSON.stringify(buildQuotePdfDocument(data).content);
      expect(text).toContain('€1.002.345,45');
    },
  );

  it('shows the refill quantity alongside the delivery date', () => {
    const data = buildQuotePdfDataWith({ locale: 'it' });
    data.lines[0] = {
      ...data.lines[0],
      quantity: 32000,
      variantData: {
        packaging: {},
        dimensions: {},
        stock: { STOCK: '0', QTA_REFILL: '32000', DATA_REFILL: '2026-04-11' },
      },
    };
    const text = JSON.stringify(buildQuotePdfDocument(data).content);
    expect(text).toContain(JSON.stringify(`32.000 ${data.templateLabels.fromDate} 11/04/2026`));
  });

  it('renders an empty quote with a repeated two-row table header', () => {
    const data = buildQuotePdfDataWith({ lines: [] });
    const text = JSON.stringify(buildQuotePdfDocument(data).content);
    expect(text).toContain(data.labels.noProducts);
    expect(text).toContain('"headerRows":2');
  });
});

describe('quote PDF product options', () => {
  it('separates "Vostro codice" from the dimensions', () => {
    const firstDimension = faker.number.int().toString();
    const secondDimension = faker.number.int().toString();
    const yourCode = faker.string.alphanumeric();
    const notes = faker.lorem.words();

    expect(
      extractQuotePdfProductOptions([
        { label: faker.lorem.word(), value: firstDimension },
        { label: 'Il Vostro Codice', value: yourCode },
        { label: faker.lorem.word(), value: secondDimension },
        { label: 'NOTE', value: notes },
      ]),
    ).toEqual({ dimensions: [firstDimension, secondDimension], yourCode, notes });
  });

  it('omits "Vostro codice" when the option is empty', () => {
    const dimension = faker.number.int().toString();

    expect(
      extractQuotePdfProductOptions([
        { label: faker.lorem.word(), value: dimension },
        { label: 'Vostro codice', value: ' ' },
      ]),
    ).toEqual({ dimensions: [dimension], yourCode: undefined, notes: undefined });
  });
});

describe('quote PDF product URL', () => {
  it('resolves a relative catalog URL against the storefront origin', () => {
    const storefrontOrigin = faker.internet.url();
    const productPath = `/${faker.lorem.slug()}/`;

    expect(resolveQuotePdfProductUrl(productPath, storefrontOrigin)).toBe(
      new URL(productPath, storefrontOrigin).href,
    );
  });

  it('rejects links that do not use HTTP or HTTPS', () => {
    expect(
      resolveQuotePdfProductUrl(`mailto:${faker.internet.email()}`, faker.internet.url()),
    ).toBeUndefined();
  });
});

describe('quote PDF filename', () => {
  it('sanitizes the identifier and includes the generation date', () => {
    const prefix = faker.lorem.word();
    const identifier = `${faker.lorem.word()} / ${faker.lorem.word()}`;
    const date = faker.date.anytime();
    const fileName = buildQuotePdfFileName(prefix, identifier, date);

    expect(fileName).toContain(prefix);
    expect(fileName).toContain(date.toISOString().slice(0, 10));
    expect(fileName).not.toContain(' ');
    expect(fileName).not.toContain('/');
    expect(fileName).toMatch(/\.pdf$/);
  });
});

describe('quote PDF image preparation', () => {
  it('returns no image when a remote asset cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    await expect(imageUrlToDataUrl(faker.image.url())).resolves.toBeUndefined();

    vi.unstubAllGlobals();
  });
});
