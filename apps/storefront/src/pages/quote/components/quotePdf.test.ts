import { builder, faker } from 'tests/test-utils';

import {
  buildQuotePdfDocument,
  buildQuotePdfFileName,
  imageUrlToDataUrl,
  QuotePdfData,
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
      imageUrl: faker.image.url(),
      name: faker.commerce.productName(),
      sku: faker.string.alphanumeric(),
      options: [faker.lorem.words()],
      packaging: [faker.lorem.words()],
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
  it('contains quote, buyer, address, product and summary data without messages or attachments', () => {
    const excludedMessage = faker.lorem.sentence();
    const excludedAttachment = faker.system.fileName();
    const data = buildQuotePdfDataWith('WHATEVER_VALUES');
    const productImage = `data:image/jpeg;base64,${faker.string.alphanumeric()}`;
    const document = buildQuotePdfDocument(data, {
      products: { [data.lines[0].id]: productImage },
    });
    const serializedDocument = JSON.stringify(document.content);

    expect(serializedDocument).toEqual(expect.stringContaining(data.contactInfo.name as string));
    expect(serializedDocument).toEqual(expect.stringContaining(data.billingAddress.address!));
    expect(serializedDocument).toEqual(expect.stringContaining(data.shippingAddress.address!));
    expect(serializedDocument).toEqual(expect.stringContaining(data.lines[0].name));
    expect(serializedDocument).toEqual(expect.stringContaining(data.lines[0].options[0]));
    expect(serializedDocument).toEqual(expect.stringContaining(data.lines[0].packaging[0]));
    expect(serializedDocument).toEqual(expect.stringContaining(productImage));
    expect(serializedDocument).toEqual(expect.stringContaining(data.summary.grandTotal));
    expect(serializedDocument).not.toContain(excludedMessage);
    expect(serializedDocument).not.toContain(excludedAttachment);
  });

  it('uses the store name when the logo is unavailable and renders an empty-products row', () => {
    const data = buildQuotePdfDataWith({ lines: [] });
    const document = buildQuotePdfDocument(data);
    const serializedDocument = JSON.stringify(document.content);

    expect(serializedDocument).toEqual(expect.stringContaining(data.storeName));
    expect(serializedDocument).toEqual(expect.stringContaining(data.labels.noProducts));
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
