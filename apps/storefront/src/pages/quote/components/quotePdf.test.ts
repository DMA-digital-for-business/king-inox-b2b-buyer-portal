import { builder, faker } from 'tests/test-utils';

import {
  buildQuotePdfDocument,
  buildQuotePdfFileName,
  extractQuotePdfProductOptions,
  imageUrlToDataUrl,
  QuotePdfData,
  resolvePdfMakeVirtualFileSystem,
  resolveQuotePdfProductUrl,
} from './quotePdf';

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

  it('contains quote, buyer, address, product and summary data with only the logo image', () => {
    const excludedMessage = faker.lorem.sentence();
    const excludedAttachment = faker.system.fileName();
    const data = buildQuotePdfDataWith('WHATEVER_VALUES');
    const logoImage = `data:image/jpeg;base64,${faker.string.alphanumeric()}`;
    const document = buildQuotePdfDocument(data, {
      logo: logoImage,
    });
    const serializedDocument = JSON.stringify(document.content);

    expect(serializedDocument).toEqual(expect.stringContaining(data.contactInfo.name as string));
    expect(serializedDocument).toEqual(expect.stringContaining(data.billingAddress.address!));
    expect(serializedDocument).toEqual(expect.stringContaining(data.shippingAddress.address!));
    expect(serializedDocument).toContain(
      `"text":[{"text":"${data.lines[0].articleCode}","link":"${data.lines[0].productUrl}"},{"text":" - ${data.lines[0].dimensions.join('X')}"},{"text":" - ${data.lines[0].notes}"}]`,
    );
    expect(serializedDocument).toContain(`Il vostro codice: ${data.lines[0].yourCode}`);
    expect(serializedDocument).toContain(`"link":"${data.lines[0].productUrl}"`);
    expect(serializedDocument).toEqual(expect.stringContaining(data.lines[0].packaging.join('; ')));
    expect(serializedDocument.match(/"image":/g)).toHaveLength(1);
    expect(serializedDocument).toContain(logoImage);
    expect(serializedDocument).toEqual(expect.stringContaining(data.summary.grandTotal));
    expect(serializedDocument).not.toContain(excludedMessage);
    expect(serializedDocument).not.toContain(excludedAttachment);
  });

  it('includes issued and expiration dates without duplicating label colons', () => {
    const issuedAt = faker.date.past().toLocaleDateString();
    const expirationDate = faker.date.future().toLocaleDateString();
    const issuedOnLabel = `${faker.lorem.words()}:`;
    const expirationDateLabel = `${faker.lorem.words()}:`;
    const data = buildQuotePdfDataWith({
      issuedAt,
      expirationDate,
      labels: buildLabelsWith({
        issuedOn: issuedOnLabel,
        expirationDate: expirationDateLabel,
      }),
    });
    const serializedDocument = JSON.stringify(buildQuotePdfDocument(data).content);

    expect(serializedDocument).toContain(`${issuedOnLabel} ${issuedAt}`);
    expect(serializedDocument).toContain(`${expirationDateLabel} ${expirationDate}`);
    expect(serializedDocument).not.toContain(`${issuedOnLabel}:`);
    expect(serializedDocument).not.toContain(`${expirationDateLabel}:`);
  });

  it('omits issued and expiration labels when the quote has no date data', () => {
    const issuedOnLabel = faker.lorem.words();
    const expirationDateLabel = faker.lorem.words();
    const data = buildQuotePdfDataWith({
      labels: buildLabelsWith({
        issuedOn: issuedOnLabel,
        expirationDate: expirationDateLabel,
      }),
    });
    const serializedDocument = JSON.stringify(buildQuotePdfDocument(data).content);

    expect(serializedDocument).not.toContain(issuedOnLabel);
    expect(serializedDocument).not.toContain(expirationDateLabel);
  });

  it('uses the store name when the logo is unavailable and renders an empty-products row', () => {
    const data = buildQuotePdfDataWith({ lines: [] });
    const document = buildQuotePdfDocument(data);
    const serializedDocument = JSON.stringify(document.content);

    expect(serializedDocument).toEqual(expect.stringContaining(data.storeName));
    expect(serializedDocument).toEqual(expect.stringContaining(data.labels.noProducts));
  });

  it('does not add a separator for missing product notes', () => {
    const line = {
      ...buildQuotePdfDataWith('WHATEVER_VALUES').lines[0],
      productUrl: undefined,
      notes: undefined,
    };
    const data = buildQuotePdfDataWith({ lines: [line] });
    const serializedDocument = JSON.stringify(buildQuotePdfDocument(data).content);

    expect(serializedDocument).toContain(
      `"text":[{"text":"${line.articleCode}"},{"text":" - ${line.dimensions.join('X')}"}]`,
    );
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
