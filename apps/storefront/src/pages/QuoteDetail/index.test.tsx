import { useParams } from 'react-router-dom';
import {
  buildCompanyStateWith,
  builder,
  buildGlobalStateWith,
  buildQuoteWith,
  buildStoreInfoStateWith,
  delay,
  faker,
  getUnixTime,
  graphql,
  http,
  HttpResponse,
  renderWithProviders,
  screen,
  startMockServer,
  userEvent,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from 'tests/test-utils';
import { when } from 'vitest-when';

import { B2BProducts, ProductSearch } from '@/shared/service/b2b/graphql/product';
import { B2BQuoteDetail, QuoteExtraFieldsConfig } from '@/shared/service/b2b/graphql/quote';
import { CompanyStatus, CustomerRole, UserTypes } from '@/types';

import { downloadQuotePdf, printQuotePdf } from '../quote/components/quotePdf';

import QuoteDetail from './index';

vitest.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useParams: vitest.fn(),
}));

vitest.mock('../quote/components/quotePdf', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../quote/components/quotePdf')>()),
  downloadQuotePdf: vitest.fn(),
  printQuotePdf: vitest.fn(),
}));

const { server } = startMockServer();

type QuoteProduct = B2BQuoteDetail['data']['quote']['productsList'][number];

const buildQuoteProductWith = builder<QuoteProduct>(() => ({
  productId: faker.number.int().toString(),
  sku: faker.string.uuid(),
  basePrice: faker.commerce.price(),
  discount: faker.commerce.price(),
  offeredPrice: faker.commerce.price(),
  quantity: faker.number.int(),
  variantId: faker.number.int(),
  imageUrl: faker.image.url(),
  orderQuantityMaximum: faker.number.int(),
  orderQuantityMinimum: faker.number.int(),
  productName: faker.commerce.productName(),
  purchaseHandled: faker.datatype.boolean(),
  options: Array.from({ length: faker.number.int({ min: 0, max: 10 }) }, () => ({
    type: faker.lorem.word(),
    optionId: faker.number.int(),
    optionName: faker.lorem.word(),
    optionLabel: faker.commerce.productMaterial(),
    optionValue: faker.lorem.word(),
  })),
  notes: faker.lorem.sentence(),
  costPrice: faker.commerce.price(),
  inventoryTracking: faker.lorem.word(),
  inventoryLevel: faker.number.int(),
  backorderMessage: undefined,
  totalOnHand: undefined,
  quantityBackordered: undefined,
}));

const buildProductSearchWith = builder<ProductSearch>(() => ({
  id: faker.number.int(),
  name: faker.commerce.productName(),
  sku: faker.string.uuid(),
  costPrice: faker.commerce.price(),
  inventoryLevel: faker.number.int(),
  inventoryTracking: faker.helpers.arrayElement(['none', 'simple', 'complex']),
  availability: faker.helpers.arrayElement(['available', 'unavailable']),
  orderQuantityMinimum: faker.number.int(),
  orderQuantityMaximum: faker.number.int(),
  variants: Array.from({ length: faker.number.int({ min: 0, max: 10 }) }, () => ({
    variant_id: faker.number.int(),
    product_id: faker.number.int(),
    sku: faker.string.uuid(),
    option_values: Array.from({ length: faker.number.int({ min: 0, max: 10 }) }, () => ({
      id: faker.number.int(),
      label: faker.commerce.productAdjective(),
      option_id: faker.number.int(),
      option_display_name: faker.commerce.productAdjective(),
    })),
    calculated_price: parseFloat(faker.commerce.price()),
    image_url: faker.image.url(),
    has_price_list: faker.datatype.boolean(),
    bulk_prices: [],
    purchasing_disabled: faker.datatype.boolean(),
    cost_price: parseFloat(faker.commerce.price()),
    inventory_level: faker.number.int(),
    bc_calculated_price: {
      as_entered: parseFloat(faker.commerce.price()),
      tax_inclusive: parseFloat(faker.commerce.price()),
      tax_exclusive: parseFloat(faker.commerce.price()),
      entered_inclusive: faker.datatype.boolean(),
    },
  })),
  currencyCode: faker.finance.currencyCode(),
  imageUrl: faker.image.url(),
  modifiers: [],
  options: Array.from({ length: faker.number.int({ min: 0, max: 10 }) }, () => ({
    option_id: faker.number.int(),
    display_name: faker.commerce.productAdjective(),
    sort_order: faker.number.int(),
    is_required: faker.datatype.boolean(),
  })),
  optionsV3: Array.from({ length: faker.number.int({ min: 0, max: 10 }) }, () => ({
    id: faker.number.int(),
    product_id: faker.number.int(),
    name: faker.commerce.productAdjective(),
    display_name: faker.commerce.productAdjective(),
    type: faker.helpers.arrayElement(['rectangles', 'swatch', 'dropdown']),
    sort_order: faker.number.int(),
    option_values: Array.from({ length: faker.number.int({ min: 0, max: 10 }) }, () => ({
      id: faker.number.int(),
      label: faker.commerce.productAdjective(),
      sort_order: faker.number.int(),
      value_data: null,
      is_default: faker.datatype.boolean(),
    })),
    config: [],
  })),
  channelId: [],
  productUrl: faker.internet.url(),
  taxClassId: faker.number.int(),
  isPriceHidden: faker.datatype.boolean(),
}));

const buildProductSearchResponseWith = builder<B2BProducts>(() => ({
  data: {
    productsSearch: Array.from({ length: faker.number.int({ min: 0, max: 10 }) }, () => ({
      ...buildProductSearchWith('WHATEVER_VALUES'),
    })),
  },
}));

const buildQuoteExtraFieldsWith = builder<QuoteExtraFieldsConfig>(() => ({
  data: { quoteExtraFieldsConfig: [] },
}));

describe('when the user is a B2B customer', () => {
  const approvedB2BCompany = buildCompanyStateWith({
    companyInfo: { status: CompanyStatus.APPROVED },
    customer: { userType: UserTypes.MULTIPLE_B2C },
  });

  const storeInfoWithDateFormat = buildStoreInfoStateWith({ timeFormat: { display: 'j F Y' } });

  const preloadedState = {
    company: approvedB2BCompany,
    storeInfo: storeInfoWithDateFormat,
    global: buildGlobalStateWith('WHATEVER_VALUES'),
  };

  it.each([
    { status: 0, mode: 'success' },
    { status: 1, mode: 'success' },
    { status: 1, mode: 'sent' },
    { status: 1, mode: 'sent-string' },
    { status: 1, mode: 'sent-ms' },
    { status: 1, mode: 'empty-date' },
    { status: 1, mode: 'legacy-date' },
    { status: 0, mode: 'failed' },
    { status: 1, mode: 'failed' },
    { status: 0, mode: 'opening-failed' },
    { status: 0, mode: 'missing-token' },
    { status: 0, mode: 'retry' },
  ])('requests an offer for status $status ($mode)', async ({ status, mode }) => {
    const sentAt = Math.floor(faker.date.recent().getTime() / 1000);
    const token = faker.string.alphanumeric(40);
    const quoteId = faker.number.int({ min: 100000, max: 999999 }).toString();
    const createdAt = getUnixTime(faker.date.past());
    const quote = buildQuoteWith({
      data: {
        quote: {
          id: quoteId,
          productsList: [buildQuoteProductWith('WHATEVER_VALUES')],
          createdAt,
          status,
          extraFields: mode.startsWith('sent')
            ? [
                {
                  fieldName: 'DATA INVIO QUOTE',
                  fieldValue: mode === 'sent-ms' ? sentAt * 1000 : String(sentAt),
                },
              ]
            : [],
        },
      },
    });
    if (mode === 'sent') {
      quote.data.quote.extraFields = [{ fieldName: 'DATA INVIO QUOTE', fieldValue: sentAt }];
    }
    if (mode === 'empty-date') {
      quote.data.quote.extraFields = [{ fieldName: 'DATA INVIO QUOTE', fieldValue: '' }];
    }
    if (mode === 'legacy-date') {
      quote.data.quote.extraFields = [{ fieldName: 'send_to_king_timestampa', fieldValue: sentAt }];
    }
    const update = vitest.fn();
    let quoteReads = 0;
    const sendRequest = vitest.fn();
    const responseMessage =
      'We will respond within 2 business hours. Press OK to view the summary and details of the request you just submitted.';
    server.use(
      graphql.query('GetQuoteInfoB2B', () => {
        quoteReads += 1;
        const currentStatus = quoteReads > 1 && mode !== 'opening-failed' ? 1 : status;
        return HttpResponse.json({
          data: { quote: { ...quote.data.quote, status: currentStatus } },
        });
      }),
      graphql.query('SearchProducts', () =>
        HttpResponse.json(buildProductSearchResponseWith('WHATEVER_VALUES')),
      ),
      graphql.query('getQuoteExtraFields', () =>
        HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
      ),
      graphql.operation(({ query }) => {
        if (!query.includes('quoteUpdate(')) return undefined;
        update(query);
        if (mode === 'opening-failed') {
          return HttpResponse.json({ errors: [{ message: faker.lorem.sentence() }] });
        }
        return HttpResponse.json({
          errors: [{ message: "Field 'status' is not defined by type 'QuoteUpdateInputType'." }],
        });
      }),
      http.get('*/customer/current.jwt', () =>
        HttpResponse.text(mode === 'missing-token' ? '' : token),
      ),
      http.post('*/api/v1/bigcommerce/send-quote-to-king', async ({ request }) => {
        expect(request.headers.get('authorization')).toBe(`Bearer ${token}`);
        expect(request.headers.get('content-type')).toBe('application/json');
        expect(update).not.toHaveBeenCalled();
        if (status === 0) expect(quoteReads).toBeGreaterThan(1);
        expect(screen.queryByText(responseMessage)).not.toBeInTheDocument();
        expect(screen.getByRole('status')).toBeVisible();
        sendRequest(await request.json());
        if (mode === 'failed' || (mode === 'retry' && sendRequest.mock.calls.length === 1)) {
          return new HttpResponse(null, { status: 503 });
        }
        return HttpResponse.json({}, { status: status === 0 ? 201 : 200 });
      }),
    );
    vitest.mocked(useParams).mockReturnValue({ id: quoteId });
    const { user } = renderWithProviders(<QuoteDetail />, {
      initialEntries: [{ pathname: `/quoteDetail/${quoteId}`, state: { to: 'draft' } }],
      preloadedState: {
        ...preloadedState,
        global: { ...preloadedState.global, backorderEnabled: false },
        company: buildCompanyStateWith({
          companyInfo: { status: CompanyStatus.APPROVED },
          permissions: [{ code: 'create_quote', permissionLevel: 2 }],
          customer: { userType: UserTypes.MULTIPLE_B2C, role: CustomerRole.SENIOR_BUYER },
        }),
      },
    });
    const send = await screen.findByRole('button', { name: 'Request offer' });
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument();
    const download = screen.getByRole('button', { name: /Download/ });
    expect(download.compareDocumentPosition(send)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    if (mode.startsWith('sent')) {
      await waitFor(() => expect(download).toBeEnabled());
      expect(send).toBeDisabled();
      expect(
        screen.getByText(`Sent to King inox on ${new Date(sentAt * 1000).toLocaleString('en')}`),
      ).toBeVisible();
      expect(sendRequest).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      return;
    }
    await waitFor(() => expect(send).toBeEnabled());
    await user.click(send);
    if (['failed', 'opening-failed', 'missing-token', 'retry'].includes(mode)) {
      expect(
        await screen.findByText('Unable to send to King inox. Please try again.'),
      ).toBeInTheDocument();
      expect(send).toBeEnabled();
      expect(screen.queryByText(responseMessage)).not.toBeInTheDocument();
      expect(screen.queryByText(/Sent to King inox on/)).not.toBeInTheDocument();
      if (mode === 'opening-failed' || mode === 'missing-token') {
        expect(sendRequest).not.toHaveBeenCalled();
        return;
      }
      if (mode !== 'retry') return;
      await user.click(send);
    }
    expect(await screen.findByText(responseMessage)).toBeVisible();
    expect(screen.queryByText('Your quote was submitted')).not.toBeInTheDocument();
    expect(sendRequest).toHaveBeenLastCalledWith({ quote_id: Number(quoteId), createdAt });
    expect(sendRequest).toHaveBeenCalledTimes(mode === 'retry' ? 2 : 1);
    expect(update).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(send).toBeDisabled();
    expect(screen.getByText(/Sent to King inox on/)).toBeInTheDocument();
  });

  it.each([
    { status: 0, mode: 'success' },
    { status: 1, mode: 'success' },
    { status: 0, mode: 'not-open' },
    { status: 1, mode: 'failed' },
    { status: 1, mode: 'missing-token' },
  ])('converts a quote to an order for status $status ($mode)', async ({ status, mode }) => {
    const id = faker.number.int({ min: 100000, max: 999999 }).toString();
    const token = faker.string.alphanumeric(40);
    const createdAt = getUnixTime(faker.date.past());
    const quote = buildQuoteWith({
      data: {
        quote: { id, createdAt, status, productsList: [buildQuoteProductWith('WHATEVER_VALUES')] },
      },
    });
    quote.data.quote.companyId.id = faker.number.int({ min: 1, max: 10000 }).toString();
    const checkout = vitest.fn();
    const update = vitest.fn();
    let quoteReads = 0;
    let completeCheckout: () => void = () => {};
    const pendingCheckout = new Promise<void>((resolve) => {
      completeCheckout = resolve;
    });
    server.use(
      graphql.query('QuoteConversionAddresses', () =>
        HttpResponse.json({
          data: {
            addresses: {
              edges: [
                { node: { id: quote.data.quote.shippingAddress.addressId, extraFields: [] } },
              ],
              pageInfo: { hasNextPage: false },
            },
          },
        }),
      ),
      graphql.query('GetQuoteInfoB2B', () => {
        quoteReads += 1;
        const currentStatus = quoteReads > 1 && mode !== 'not-open' ? 1 : status;
        return HttpResponse.json({
          data: { quote: { ...quote.data.quote, status: currentStatus } },
        });
      }),
      graphql.query('SearchProducts', () =>
        HttpResponse.json(buildProductSearchResponseWith('WHATEVER_VALUES')),
      ),
      graphql.query('getQuoteExtraFields', () =>
        HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
      ),
      graphql.operation(({ query }) => {
        if (!query.includes('quoteUpdate(')) return undefined;
        update(query);
        return HttpResponse.json({
          errors: [{ message: "Field 'status' is not defined by type 'QuoteUpdateInputType'." }],
        });
      }),
      http.get('*/customer/current.jwt', () =>
        HttpResponse.text(mode === 'missing-token' ? '' : token),
      ),
      http.post('*/api/v1/bigcommerce/quote-checkout', async ({ request }) => {
        expect(request.headers.get('authorization')).toBe(`Bearer ${token}`);
        expect(request.headers.get('content-type')).toBe('application/json');
        expect(screen.getByRole('status')).toBeVisible();
        if (status === 0) expect(quoteReads).toBeGreaterThan(1);
        checkout(await request.json());
        await pendingCheckout;
        return HttpResponse.json({}, { status: mode === 'failed' ? 500 : 201 });
      }),
    );
    vitest.mocked(useParams).mockReturnValue({ id });
    const { user, navigation } = renderWithProviders(<QuoteDetail />, {
      preloadedState: {
        ...preloadedState,
        global: { ...preloadedState.global, backorderEnabled: false },
        company: buildCompanyStateWith({
          companyInfo: { status: CompanyStatus.APPROVED },
          permissions: [{ code: 'create_quote', permissionLevel: 2 }],
          customer: { userType: UserTypes.MULTIPLE_B2C, role: CustomerRole.SENIOR_BUYER },
        }),
      },
    });
    const convert = await screen.findByRole('button', { name: 'Convert to order' });
    await waitFor(() => expect(convert).toBeEnabled());
    await user.click(convert);
    expect(checkout).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('combobox', { name: /Shipping terms/ }));
    await user.click(screen.getByRole('option', { name: 'Freight collect' }));
    const confirm = screen.getByRole('button', { name: 'Continue converting to order' });
    if (mode === 'not-open' || mode === 'missing-token') await user.click(confirm);
    else await user.dblClick(confirm);
    if (mode !== 'not-open' && mode !== 'missing-token') {
      await waitFor(() =>
        expect(checkout).toHaveBeenCalledExactlyOnceWith({
          quote_id: Number(id),
          createdAt,
          shipping_terms: 'porto_assegnato',
        }),
      );
      expect(convert).toBeDisabled();
      expect(navigation).not.toHaveBeenCalledWith('/orders');
      completeCheckout();
    }
    if (mode === 'success') {
      await waitFor(() => expect(navigation).toHaveBeenCalledWith('/orders'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } else {
      expect(
        await screen.findByText('Unable to convert to order. Please try again.'),
      ).toBeVisible();
      expect(navigation).not.toHaveBeenCalledWith('/orders');
      expect(convert).toBeEnabled();
      if (mode === 'not-open' || mode === 'missing-token') expect(checkout).not.toHaveBeenCalled();
      else expect(checkout).toHaveBeenCalledTimes(1);
    }
    expect(update).not.toHaveBeenCalled();
  });

  it('displays the quote number as the page "title"', async () => {
    const quote = buildQuoteWith({ data: { quote: { id: '272989', quoteNumber: '911911' } } });

    server.use(
      graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)),
      graphql.query('SearchProducts', () =>
        HttpResponse.json(buildProductSearchResponseWith('WHATEVER_VALUES')),
      ),
      graphql.query('getQuoteExtraFields', () =>
        HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
      ),
    );

    vitest.mocked(useParams).mockReturnValue({ id: '272989' });

    renderWithProviders(<QuoteDetail />, {
      preloadedState: {
        ...preloadedState,
        global: { ...preloadedState.global, backorderEnabled: false },
      },
    });

    expect(await screen.findByText('#911911')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Quote', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit info' })).not.toBeInTheDocument();
  });

  it.each([0, 1])(
    'blocks PDF download without a shipping address for editable quote status %s',
    async (status) => {
      const quote = buildQuoteWith({
        data: { quote: { id: '272989', status, shippingAddress: { address: '' } } },
      });
      server.use(
        graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)),
        graphql.query('SearchProducts', () =>
          HttpResponse.json(buildProductSearchResponseWith('WHATEVER_VALUES')),
        ),
        graphql.query('getQuoteExtraFields', () =>
          HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
        ),
      );
      vitest.mocked(useParams).mockReturnValue({ id: '272989' });
      renderWithProviders(<QuoteDetail />, {
        preloadedState: {
          ...preloadedState,
          global: { ...preloadedState.global, backorderEnabled: false },
          company: buildCompanyStateWith({
            companyInfo: { status: CompanyStatus.APPROVED },
            customer: { userType: UserTypes.MULTIPLE_B2C, role: CustomerRole.SENIOR_BUYER },
          }),
        },
      });
      await waitFor(() => expect(screen.getByRole('button', { name: /Download/ })).toBeEnabled());
      await userEvent.click(screen.getByRole('button', { name: /Download/ }));
      expect(
        await screen.findByText('A shipping address is required before downloading the quote.'),
      ).toBeInTheDocument();
      expect(downloadQuotePdf).not.toHaveBeenCalled();
    },
  );

  it.each([
    'manual',
    'automatic',
    'draft',
    'notification-failed',
    'opening-failed',
    'ordered',
    'ordered-empty-shipping',
    'ordered-null-shipping',
  ])(
    'downloads and prints the saved quote without requiring shipping details for ordered quotes (%s)',
    async (mode) => {
      const dimensions = [faker.number.int().toString(), faker.number.int().toString()];
      const yourCode = faker.string.uuid();
      const oracleId = faker.string.numeric(8);
      const product = buildQuoteProductWith({
        options: [
          {
            type: faker.lorem.word(),
            optionId: faker.number.int(),
            optionName: faker.lorem.word(),
            optionLabel: dimensions[0],
            optionValue: faker.lorem.word(),
          },
          {
            type: faker.lorem.word(),
            optionId: faker.number.int(),
            optionName: 'Vostro codice',
            optionLabel: faker.string.uuid(),
            optionValue: faker.lorem.word(),
          },
          {
            type: faker.lorem.word(),
            optionId: faker.number.int(),
            optionName: faker.lorem.word(),
            optionLabel: dimensions[1],
            optionValue: faker.lorem.word(),
          },
        ],
      });
      const issuedAt = faker.date.past();
      const expirationDate = faker.date.future();
      const salesRep = {
        salesRepName: faker.person.fullName(),
        salesRepEmail: faker.internet.email(),
        salesRepPhoneNumber: faker.phone.number(),
      };
      let quoteStatus = ['draft', 'opening-failed'].includes(mode) ? 0 : 1;
      if (mode.startsWith('ordered')) quoteStatus = 4;
      const quote = buildQuoteWith({
        data: {
          quote: {
            id: '272989',
            salesRepInfo: salesRep,
            status: mode === 'manual' ? 2 : quoteStatus,
            createdAt: getUnixTime(issuedAt),
            expiredAt: getUnixTime(expirationDate),
            quoteNumber: faker.string.numeric(),
            quoteTitle: faker.commerce.productName(),
            productsList: [product],
          },
        },
      });
      if (mode === 'ordered-empty-shipping') quote.data.quote.shippingAddress.address = '';
      const printWindow = { close: vitest.fn() } as unknown as Window;
      const openWindow = vitest.spyOn(window, 'open').mockReturnValue(printWindow);
      vitest.mocked(downloadQuotePdf).mockResolvedValue();
      vitest.mocked(printQuotePdf).mockResolvedValue();

      const token = faker.string.alphanumeric(40);
      const notify = vitest.fn();
      const update = vitest.fn();
      let quoteReads = 0;
      server.use(
        http.get('*/customer/current.jwt', () => HttpResponse.text(token)),
        http.post('*/api/v1/bigcommerce/quote-pdf-created', async ({ request }) => {
          expect(request.headers.get('authorization')).toBe(`Bearer ${token}`);
          expect(downloadQuotePdf).not.toHaveBeenCalled();
          expect(update).not.toHaveBeenCalled();
          notify(await request.json());
          return new HttpResponse(null, { status: mode === 'notification-failed' ? 503 : 204 });
        }),
        graphql.operation(({ query }) => {
          if (!query.includes('quoteUpdate(')) return undefined;
          expect(notify).not.toHaveBeenCalled();
          update(query);
          if (mode === 'opening-failed')
            return HttpResponse.json({ errors: [{ message: 'Update failed' }] });
          return HttpResponse.json({
            errors: [{ message: "Field 'status' is not defined by type 'QuoteUpdateInputType'." }],
          });
        }),
        graphql.query('GetQuotePdfCustomerOracle', () =>
          HttpResponse.json({
            data: {
              customer: {
                entityId: quote.data.quote.bcCustomerId,
                customerOracleMetafields: {
                  edges: [{ node: { key: 'CUSTOMER_ID', value: oracleId } }],
                },
              },
            },
          }),
        ),
        graphql.query('GetQuotePdfVariants', ({ query }) => {
          expect(query).toContain('keys: ["CUSTOM_CODES"]');
          return HttpResponse.json({
            data: {
              site: {
                p0: {
                  variants: {
                    edges: [
                      {
                        node: {
                          entityId: product.variantId,
                          customCodes: {
                            edges: [
                              {
                                node: {
                                  key: 'CUSTOM_CODES',
                                  value: `${oracleId}-other=OTHER|${oracleId}=${yourCode}`,
                                },
                              },
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          });
        }),
        graphql.query('GetQuotePdfAddresses', () =>
          HttpResponse.json({
            data: { addresses: { edges: [], pageInfo: { hasNextPage: false } } },
          }),
        ),
        graphql.query('GetQuotePdfCompany', () =>
          HttpResponse.json({ data: { pdfCompany: null } }),
        ),
        graphql.query('GetQuoteInfoB2B', () => {
          quoteReads += 1;
          const status = quoteReads > 1 && mode === 'draft' ? 1 : quote.data.quote.status;
          return HttpResponse.json({
            data: {
              quote: {
                ...quote.data.quote,
                status,
                shippingAddress:
                  mode === 'ordered-null-shipping' ? null : quote.data.quote.shippingAddress,
              },
            },
          });
        }),
        graphql.query('SearchProducts', () =>
          HttpResponse.json(buildProductSearchResponseWith('WHATEVER_VALUES')),
        ),
        graphql.query('getQuoteExtraFields', () =>
          HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
        ),
      );

      vitest.mocked(useParams).mockReturnValue({ id: '272989' });

      renderWithProviders(<QuoteDetail />, {
        initialEntries: [
          { pathname: '/quoteDetail/272989', state: { downloadPdf: mode === 'automatic' } },
        ],
        preloadedState: {
          ...preloadedState,
          global: { ...preloadedState.global, backorderEnabled: false },
          company: buildCompanyStateWith({
            companyInfo: { status: CompanyStatus.APPROVED },
            customer: { userType: UserTypes.MULTIPLE_B2C, role: CustomerRole.SENIOR_BUYER },
          }),
        },
      });

      if (mode !== 'automatic') {
        await waitFor(() => expect(screen.getByRole('button', { name: /Download/ })).toBeEnabled());
        await userEvent.click(screen.getByRole('button', { name: /Download/ }));
      }

      if (mode === 'notification-failed' || mode === 'opening-failed') {
        expect(
          await screen.findByText('The PDF could not be created. Please try again.'),
        ).toBeInTheDocument();
        expect(downloadQuotePdf).not.toHaveBeenCalled();
        if (mode === 'opening-failed') expect(notify).not.toHaveBeenCalled();
        return;
      }

      await waitFor(() => {
        expect(downloadQuotePdf).toHaveBeenCalledWith(
          expect.objectContaining({
            quoteNumber: quote.data.quote.quoteNumber,
            isDraft: false,
            quoteTitle: quote.data.quote.quoteTitle,
            salesRep: {
              name: salesRep.salesRepName,
              email: salesRep.salesRepEmail,
              phone: salesRep.salesRepPhoneNumber,
            },
            referenceNumber: quote.data.quote.referenceNumber || quote.data.quote.quoteNumber,
            issuedAt: expect.any(String),
            expirationDate: expect.any(String),
            lines: expect.arrayContaining([
              expect.objectContaining({
                articleCode: product.productName,
                unitPrice: expect.not.stringMatching(/\p{Sc}/u),
                dimensions,
                yourCode,
                packaging: expect.arrayContaining([
                  expect.stringContaining('Box:'),
                  expect.stringContaining('Mastercarton:'),
                  expect.stringContaining('Pallet:'),
                ]),
              }),
            ]),
          }),
        );
      });

      if (mode.startsWith('ordered')) {
        expect(
          screen.queryByText('A shipping address is required before downloading the quote.'),
        ).not.toBeInTheDocument();
        expect(screen.getByText('Ordered')).toBeInTheDocument();
        expect(downloadQuotePdf).toHaveBeenCalledWith(
          expect.objectContaining({
            shippingAddress:
              mode === 'ordered-null-shipping' ? {} : quote.data.quote.shippingAddress,
          }),
        );
      }

      expect(notify).toHaveBeenCalledExactlyOnceWith({
        quote_id: Number(quote.data.quote.id),
        createdAt: quote.data.quote.createdAt,
      });
      if (mode === 'draft') {
        expect(update).not.toHaveBeenCalled();
        expect(await screen.findByText('Open')).toBeInTheDocument();
      } else {
        expect(update).not.toHaveBeenCalled();
      }
      if (mode !== 'manual') {
        expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument();
        return;
      }

      await waitFor(() => expect(screen.getByRole('button', { name: 'Print' })).toBeEnabled());
      const downloadButton = screen.getByRole('button', { name: /Download/ });
      const printButton = screen.getByRole('button', { name: 'Print' });
      expect(downloadButton.compareDocumentPosition(printButton)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      await userEvent.click(printButton);

      await waitFor(() => {
        expect(printQuotePdf).toHaveBeenCalledWith(
          expect.objectContaining({
            referenceNumber: quote.data.quote.referenceNumber || quote.data.quote.quoteNumber,
          }),
          printWindow,
        );
      });
      expect(openWindow).toHaveBeenCalledWith('', '_blank');
      expect(downloadQuotePdf).toHaveBeenCalledTimes(1);
    },
  );

  it('displays the quote status and issue date without an expiration date', async () => {
    const quote = buildQuoteWith({
      data: {
        quote: {
          id: '272989',
          status: 4,
          createdAt: getUnixTime(new Date('2 February 2025')),
          expiredAt: getUnixTime(new Date('3 March 2025')),
        },
      },
    });

    server.use(
      graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)),
      graphql.query('SearchProducts', () =>
        HttpResponse.json(buildProductSearchResponseWith('WHATEVER_VALUES')),
      ),
      graphql.query('getQuoteExtraFields', () =>
        HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
      ),
    );

    vitest.mocked(useParams).mockReturnValue({ id: '272989' });

    renderWithProviders(<QuoteDetail />, { preloadedState });

    expect(await screen.findByText('Ordered')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Issued on:' })).toBeInTheDocument();
    expect(screen.getByText('02/02/2025')).toBeInTheDocument();

    expect(screen.queryByRole('heading', { name: 'Expiration date:' })).not.toBeInTheDocument();
    expect(screen.queryByText('03/03/2025')).not.toBeInTheDocument();
  });

  it('displays the expiration date for an active quote', async () => {
    const quote = buildQuoteWith({
      data: {
        quote: {
          id: '272989',
          status: 1,
          createdAt: getUnixTime(new Date('2 February 2025')),
          expiredAt: getUnixTime(new Date('3 March 2025')),
        },
      },
    });

    server.use(
      graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)),
      graphql.query('SearchProducts', () =>
        HttpResponse.json(buildProductSearchResponseWith('WHATEVER_VALUES')),
      ),
      graphql.query('getQuoteExtraFields', () =>
        HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
      ),
    );

    vitest.mocked(useParams).mockReturnValue({ id: '272989' });

    renderWithProviders(<QuoteDetail />, { preloadedState });

    expect(await screen.findByText('Open')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Issued on:' })).toBeInTheDocument();
    expect(screen.getByText('02/02/2025')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Expiration date:' })).toBeInTheDocument();
    expect(screen.getByText('03/03/2025')).toBeInTheDocument();
  });

  it('displays a summary of the products within the quote', async () => {
    const measure = faker.string.alphanumeric(10);
    const buildOptionWith = builder(() => ({
      type: faker.lorem.word(),
      optionId: faker.number.int(),
      optionName: 'disambigua',
      optionLabel: '0',
      optionValue: '0',
    }));
    const woolSock = buildQuoteProductWith({
      productName: 'Wool Socks',
      options: [buildOptionWith('WHATEVER_VALUES')],
      quantity: 10,
      basePrice: '49.00',
      offeredPrice: '49.00',
    });

    const denimJacket = buildQuoteProductWith({
      productName: 'Denim Jacket',
      quantity: 3,
      basePrice: '133.33',
      offeredPrice: '133.33',
    });

    const quote = buildQuoteWith({
      data: {
        quote: {
          id: '272989',
          productsList: [woolSock, denimJacket],
          currency: { token: '$', location: 'left', decimalToken: '.', decimalPlaces: 2 },
        },
      },
    });

    server.use(
      graphql.query('GetQuotePdfVariants', () =>
        HttpResponse.json({
          data: {
            site: {
              p0: {
                variants: {
                  edges: [
                    {
                      node: {
                        entityId: woolSock.variantId,
                        dimensions: { edges: [{ node: { key: 'MISURA', value: measure } }] },
                      },
                    },
                  ],
                },
              },
            },
          },
        }),
      ),
      graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)),
      graphql.query('SearchProducts', () =>
        HttpResponse.json(buildProductSearchResponseWith('WHATEVER_VALUES')),
      ),
      graphql.query('getQuoteExtraFields', () =>
        HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
      ),
    );

    vitest.mocked(useParams).mockReturnValue({ id: '272989' });

    renderWithProviders(<QuoteDetail />, {
      preloadedState: {
        ...preloadedState,
        global: { ...preloadedState.global, backorderEnabled: false },
      },
    });

    expect(await screen.findByText('2 products')).toBeInTheDocument();

    expect(screen.getByRole('columnheader', { name: 'Misura' })).toBeInTheDocument();
    expect(await screen.findByText(measure)).toBeInTheDocument();
    expect(screen.queryByText(/disambigua/i)).not.toBeInTheDocument();

    const rowOfWoolSocks = await screen.findByRole('row', { name: /Wool Socks/ });

    expect(within(rowOfWoolSocks).getByRole('cell', { name: '4,900.00 %' })).toBeInTheDocument();
    expect(within(rowOfWoolSocks).getByRole('cell', { name: '10' })).toBeInTheDocument();
    expect(within(rowOfWoolSocks).getByRole('cell', { name: '$490.00' })).toBeInTheDocument();

    const rowOfDenimJacket = await screen.findByRole('row', { name: /Denim Jacket/ });

    expect(within(rowOfDenimJacket).getByRole('cell', { name: '13,333.00 %' })).toBeInTheDocument();
    expect(within(rowOfDenimJacket).getByRole('cell', { name: '3' })).toBeInTheDocument();
    expect(within(rowOfDenimJacket).getByRole('cell', { name: '$399.99' })).toBeInTheDocument();
  });

  it.each([0, 1, 4])('uses the standard quote layout and actions for status %s', async (status) => {
    const quote = buildQuoteWith({
      data: {
        quote: {
          id: '272989',
          status,
          productsList: [buildQuoteProductWith('WHATEVER_VALUES')],
          currency: { token: '$', location: 'left', decimalToken: '.', decimalPlaces: 2 },
          displayDiscount: true,
          discount: '25.00',
          subtotal: '1000.00',
          shippingTotal: '50.00',
          taxTotal: '33.00',
          totalAmount: '1025.00',
        },
      },
    });

    server.use(
      graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)),
      graphql.query('SearchProducts', () =>
        HttpResponse.json(buildProductSearchResponseWith('WHATEVER_VALUES')),
      ),
      graphql.query('getQuoteExtraFields', () =>
        HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
      ),
    );

    vitest.mocked(useParams).mockReturnValue({ id: '272989' });

    renderWithProviders(<QuoteDetail />, {
      preloadedState: {
        ...preloadedState,
        company: buildCompanyStateWith({
          companyInfo: { status: CompanyStatus.APPROVED },
          permissions: [{ code: 'create_quote', permissionLevel: 2 }],
          customer: { userType: UserTypes.MULTIPLE_B2C, role: CustomerRole.SENIOR_BUYER },
        }),
        global: {
          ...preloadedState.global,
          backorderEnabled: false,
          blockPendingQuoteNonPurchasableOOS: { isEnableProduct: false },
        },
      },
    });

    const productCount = await screen.findByText('1 product');
    expect(productCount.parentElement).toHaveTextContent('1 product (Total $1,025.00)');
    expect(screen.queryByRole('heading', { name: 'Quote summary' })).not.toBeInTheDocument();
    expect(screen.queryByText('Message')).not.toBeInTheDocument();
    expect(screen.queryByText('Attachment')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument();
    const download = screen.getByRole('button', { name: /Download/ });
    const offer = screen.getByRole('button', { name: 'Request offer' });
    const convert = screen.getByRole('button', { name: 'Convert to order' });
    expect(download).toBeEnabled();
    expect(download.compareDocumentPosition(offer)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(offer.compareDocumentPosition(convert)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    if (status === 4) {
      expect(offer).toBeDisabled();
      expect(convert).toBeDisabled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } else {
      expect(offer).toBeEnabled();
      expect(convert).toBeEnabled();
    }
  });

  it('displays snackbar error on load if a product in the quote has validation errors', async () => {
    const quote = buildQuoteWith({
      data: {
        quote: {
          id: '272989',
          quoteNumber: '911911',
          status: 2,
          allowCheckout: true,
          productsList: [buildQuoteProductWith({ productId: '123' })],
        },
      },
    });

    server.use(
      graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)),
      graphql.query('SearchProducts', () =>
        HttpResponse.json(
          buildProductSearchResponseWith({
            data: {
              productsSearch: [buildProductSearchWith({ id: 123 })],
            },
          }),
        ),
      ),
      graphql.query('getQuoteExtraFields', () =>
        HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
      ),
      graphql.query('ValidateProduct', () =>
        HttpResponse.json({
          data: {
            validateProduct: {
              responseType: 'ERROR',
              message: 'A product with the id of 123 does not have sufficient stock',
              errorCode: 'OOS',
              product: {
                availableToSell: faker.number.int(),
              },
            },
          },
        }),
      ),
    );

    vitest.mocked(useParams).mockReturnValue({ id: '272989' });

    renderWithProviders(<QuoteDetail />, {
      preloadedState: {
        ...preloadedState,
        company: {
          ...preloadedState.company,
          permissions: [
            { code: 'purchase_enable', permissionLevel: 1 },
            { code: 'checkout_with_quote', permissionLevel: 1 },
          ],
        },
        global: {
          ...preloadedState.global,
          backorderEnabled: true,
        },
      },
    });

    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

    expect(
      await screen.findByText(/does not have sufficient stock\. Please contact your Sales Rep/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /PROCEED TO CHECKOUT/i })).not.toBeInTheDocument();
  });

  it('does not render any message for product that has a validation warning', async () => {
    const quote = buildQuoteWith({
      data: {
        quote: {
          id: '272989',
          quoteNumber: '911911',
          productsList: [buildQuoteProductWith({ productId: '123' })],
        },
      },
    });

    server.use(
      graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)),
      graphql.query('SearchProducts', () =>
        HttpResponse.json(
          buildProductSearchResponseWith({
            data: {
              productsSearch: [buildProductSearchWith({ id: 123 })],
            },
          }),
        ),
      ),
      graphql.query('getQuoteExtraFields', () =>
        HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
      ),
      graphql.query('ValidateProduct', () =>
        HttpResponse.json({
          data: {
            validateProduct: {
              responseType: 'WARNING',
              message: 'A product with the id of 123 does not have sufficient stock',
            },
          },
        }),
      ),
    );

    vitest.mocked(useParams).mockReturnValue({ id: '272989' });

    renderWithProviders(<QuoteDetail />, {
      preloadedState: {
        ...preloadedState,
        global: {
          ...preloadedState.global,
          backorderEnabled: true,
        },
      },
    });

    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

    expect(
      screen.queryByText('A product with the id of 123 does not have sufficient stock'),
    ).not.toBeInTheDocument();
  });

  it('does not display a payment button for a quote eligible for checkout', async () => {
    const quote = buildQuoteWith({
      data: {
        quote: {
          id: '123',
          quoteNumber: '123',
          status: 2,
          allowCheckout: true,
          productsList: [buildQuoteProductWith({ productId: '123' })],
        },
      },
    });

    server.use(
      graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)),
      graphql.query('SearchProducts', () =>
        HttpResponse.json(
          buildProductSearchResponseWith({
            data: {
              productsSearch: [buildProductSearchWith({ id: 123 })],
            },
          }),
        ),
      ),
      graphql.query('getQuoteExtraFields', () =>
        HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
      ),
      graphql.query('ValidateProduct', () =>
        HttpResponse.json({
          data: {
            validateProduct: {
              responseType: 'SUCCESS',
              message: 'Product is valid',
            },
          },
        }),
      ),
      graphql.query('getStorefrontProductSettings', () =>
        HttpResponse.json({
          data: {
            storefrontProductSettings: {
              hidePriceFromGuests: false,
            },
          },
        }),
      ),
      graphql.mutation('CheckoutQuote', () =>
        HttpResponse.json({
          data: {
            quoteCheckout: {
              quoteCheckout: {
                checkoutUrl:
                  'https://my-store/cart.php?action=loadInCheckout&id=123&token=1234567889&isFromQuote=Y',
                cartId: '123',
                cartUrl: 'https://my-store/cart.php?action=load&id=123&token=1234567889',
              },
            },
          },
        }),
      ),
    );

    vitest.mocked(useParams).mockReturnValue({ id: '123' });

    renderWithProviders(<QuoteDetail />, {
      preloadedState: {
        ...preloadedState,
        company: {
          ...preloadedState.company,
          permissions: [
            { code: 'purchase_enable', permissionLevel: 1 },
            { code: 'checkout_with_quote', permissionLevel: 1 },
          ],
        },
        global: {
          ...preloadedState.global,
          backorderEnabled: true,
        },
      },
    });

    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

    expect(screen.queryByRole('button', { name: /proceed to checkout/i })).not.toBeInTheDocument();
  });

  it('renders TBD instead of price in quote summary if product has an error', async () => {
    const quote = buildQuoteWith({
      data: {
        quote: {
          id: '272989',
          quoteNumber: '911911',
          status: 1,
          grandTotal: '1000.00',
          allowCheckout: true,
          discount: '0.00',
          displayDiscount: true,
          shippingMethod: {
            description: 'Flat rate',
          },
          taxTotal: '0.0000',
          subtotal: '1000.00',
          shippingTotal: '0.0000',
          salesRep: '',
          salesRepEmail: '',
          productsList: [
            buildQuoteProductWith({
              productId: '123',
              offeredPrice: '1000.00',
              basePrice: '1000.00',
            }),
          ],
        },
      },
    });

    server.use(
      graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)),
      graphql.query('SearchProducts', () =>
        HttpResponse.json({
          data: {
            productsSearch: [buildProductSearchWith({ id: 123 })],
          },
        }),
      ),
      graphql.query('getQuoteExtraFields', () =>
        HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
      ),
      graphql.query('ValidateProduct', async () => {
        /*
          adding a delay to make sure we are mimicking the scenario where validateProduct api takes time
          and product error is visible immediately after loading
        */
        await delay(200);

        return HttpResponse.json({
          data: {
            validateProduct: {
              responseType: 'ERROR',
              message: 'A product with the id of 123 does not have sufficient stock',
              errorCode: 'OOS',
              product: {
                availableToSell: faker.number.int(),
              },
            },
          },
        });
      }),
    );

    vitest.mocked(useParams).mockReturnValue({ id: '272989' });

    renderWithProviders(<QuoteDetail />, {
      preloadedState: {
        ...preloadedState,
        global: {
          ...preloadedState.global,
          blockPendingQuoteNonPurchasableOOS: {
            isEnableProduct: false,
          },
          backorderEnabled: true,
        },
      },
    });

    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));
    expect(
      screen.getByText(/does not have sufficient stock\. Please contact your Sales Rep/),
    ).toBeInTheDocument();
    const summaryElement = screen.getByTestId('quote-summary');
    const withinSummary = within(summaryElement);
    expect(withinSummary.getByRole('row', { name: /Original subtotal/ })).toHaveTextContent(/TBD/);
    expect(withinSummary.getByRole('row', { name: /Quoted subtotal/ })).toHaveTextContent(/TBD/);
    expect(withinSummary.getByRole('row', { name: /Shipping/ })).toHaveTextContent(/TBD/);
    expect(withinSummary.getByRole('row', { name: /Grand total/ })).toHaveTextContent(/TBD/);
  });

  it('renders prices immediately after loading in quote summary if product has no errors', async () => {
    const quote = buildQuoteWith({
      data: {
        quote: {
          id: '272989',
          quoteNumber: '911911',
          status: 2,
          grandTotal: '1000.00',
          subtotal: '1000.00',
          discount: '0.00',
          allowCheckout: true,
          taxTotal: '0.0000',
          totalAmount: '1000.00',
          shippingTotal: '0.00',
          currency: {
            token: '$',
            location: 'left',
            currencyCode: 'USD',
            decimalToken: '.',
            decimalPlaces: 2,
            thousandsToken: ',',
            currencyExchangeRate: '1.0000000000',
          },
          shippingMethod: {
            id: '4dcbf24f457dd67d5f89bcf374e0bc9b',
            cost: 0.0,
            description: 'Flat rate',
          },
          productsList: [
            buildQuoteProductWith({
              productId: '123',
              offeredPrice: '1000.00',
              basePrice: '1000.00',
            }),
          ],
          salesRep: 'john',
          salesRepEmail: 'john@email.com',
          displayDiscount: true,
        },
      },
    });

    server.use(
      graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)),
      graphql.query('SearchProducts', () =>
        HttpResponse.json({
          data: {
            productsSearch: [
              buildProductSearchWith({
                id: 123,
                costPrice: '1000',
                variants: [
                  {
                    variant_id: 132,
                    product_id: 123,
                    sku: 'test',
                    option_values: [],
                    calculated_price: 1000,
                    image_url: '',
                    has_price_list: false,
                    bulk_prices: [],
                    purchasing_disabled: false,
                    cost_price: 0,
                    inventory_level: 2,
                    bc_calculated_price: {
                      as_entered: 1000,
                      tax_inclusive: 1000,
                      tax_exclusive: 1000,
                      entered_inclusive: false,
                    },
                  },
                ],
              }),
            ],
          },
        }),
      ),
      graphql.query('getQuoteExtraFields', () =>
        HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
      ),
      graphql.query('ValidateProduct', async () => {
        /*
          adding a delay to make sure we are mimicking the scenario where validateProduct api takes time
          and still no TBD shows
        */
        await delay(200);
        return HttpResponse.json({
          data: {
            validateProduct: {
              responseType: 'SUCCESS',
              message: 'Product is valid',
            },
          },
        });
      }),
    );

    vitest.mocked(useParams).mockReturnValue({ id: '272989' });

    renderWithProviders(<QuoteDetail />, {
      preloadedState: {
        ...preloadedState,
        global: {
          ...preloadedState.global,
          backorderEnabled: true,
        },
      },
    });

    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));
    const summaryElement = screen.getByTestId('quote-summary');
    const withinSummary = within(summaryElement);
    expect(withinSummary.getByRole('row', { name: /Original subtotal/ })).toHaveTextContent(
      /\$1,000.00/,
    );
    expect(withinSummary.getByRole('row', { name: /Discount/ })).toHaveTextContent(/\$0.00/);
    expect(withinSummary.getByRole('row', { name: /Quoted subtotal/ })).toHaveTextContent(
      /\$1,000.00/,
    );
    expect(withinSummary.getByRole('row', { name: /Shipping/ })).toHaveTextContent(/\$0.00/);
    expect(withinSummary.getByRole('row', { name: /Tax/ })).toHaveTextContent(/\$0.00/);
    expect(withinSummary.getByRole('row', { name: /Grand total/ })).toHaveTextContent(/\$1,000.00/);
  });

  it('does not render payment button even when auto quoting is enabled and quote has sales rep revision', async () => {
    const quote = buildQuoteWith({
      data: {
        quote: {
          id: '123',
          quoteNumber: '123',
          status: 2,
          allowCheckout: true,
          salesRep: 'John Sales', // sales rep already revised the quote
          salesRepEmail: 'john.sales@company.com',
          productsList: [buildQuoteProductWith({ productId: '123' })],
        },
      },
    });

    server.use(
      graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)),
      graphql.query('SearchProducts', () =>
        HttpResponse.json(
          buildProductSearchResponseWith({
            data: {
              productsSearch: [buildProductSearchWith({ id: 123 })],
            },
          }),
        ),
      ),
      graphql.query('getQuoteExtraFields', () =>
        HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
      ),
      graphql.query('ValidateProduct', () =>
        HttpResponse.json({
          data: {
            validateProduct: {
              responseType: 'SUCCESS',
              message: 'Product is valid',
            },
          },
        }),
      ),
    );

    vitest.mocked(useParams).mockReturnValue({ id: '123' });

    const stateWithAutoQuoteDisabled = {
      ...preloadedState,
      company: {
        ...preloadedState.company,
        permissions: [
          { code: 'purchase_enable', permissionLevel: 1 },
          { code: 'checkout_with_quote', permissionLevel: 1 },
        ],
      },
      global: {
        ...preloadedState.global,
        backorderEnabled: true,
        quoteConfig: [
          {
            key: 'quote_auto_quoting',
            value: '1',
            extraFields: {},
          },
        ],
      },
    };

    renderWithProviders(<QuoteDetail />, {
      preloadedState: stateWithAutoQuoteDisabled,
    });

    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

    expect(screen.queryByRole('button', { name: /PROCEED TO CHECKOUT/i })).not.toBeInTheDocument();
  });

  it('does not render Proceed to Checkout button when auto quoting is disabled and no sales rep info', async () => {
    const quote = buildQuoteWith({
      data: {
        quote: {
          id: '14234',
          quoteNumber: '2342',
          status: 2,
          allowCheckout: true,
          salesRep: '', // No sales rep
          salesRepEmail: '', // No sales rep email
          productsList: [buildQuoteProductWith({ productId: '123' })],
        },
      },
    });

    server.use(
      graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)),
      graphql.query('SearchProducts', () =>
        HttpResponse.json(
          buildProductSearchResponseWith({
            data: {
              productsSearch: [buildProductSearchWith({ id: 123 })],
            },
          }),
        ),
      ),
      graphql.query('getQuoteExtraFields', () =>
        HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
      ),
      graphql.query('ValidateProduct', () =>
        HttpResponse.json({
          data: {
            validateProduct: {
              responseType: 'WARNING',
              message: 'A product with the id of 123 does not have sufficient stock',
            },
          },
        }),
      ),
    );

    vitest.mocked(useParams).mockReturnValue({ id: '123' });

    const stateWithAutoQuoteDisabled = {
      ...preloadedState,
      global: {
        ...preloadedState.global,
        backorderEnabled: true,
        quoteConfig: [
          {
            key: 'quote_auto_quoting',
            value: '0', // Disable auto quoting
            extraFields: {},
          },
        ],
      },
    };

    renderWithProviders(<QuoteDetail />, {
      preloadedState: stateWithAutoQuoteDisabled,
    });

    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

    expect(screen.queryByRole('button', { name: /PROCEED TO CHECKOUT/i })).not.toBeInTheDocument();
  });

  it('validates products with required modifiers correctly', async () => {
    const productWithModifiers = buildQuoteProductWith({
      productId: '112',
      variantId: 77,
      productName: 'Product with Required Modifiers',
      options: [
        {
          type: 'text',
          optionId: 113,
          optionName: 'Custom Message',
          optionLabel: 'Test Message',
          optionValue: 'Test Message',
        },
        {
          type: 'dropdown',
          optionId: 114,
          optionName: 'Size',
          optionLabel: 'Large',
          optionValue: '42',
        },
      ],
    });

    const quote = buildQuoteWith({
      data: {
        quote: {
          id: '99999',
          productsList: [productWithModifiers],
        },
      },
    });

    const productSearchResult = buildProductSearchWith({
      id: 112,
      name: 'Product with Required Modifiers',
      variants: [
        {
          variant_id: 77,
          product_id: 112,
          sku: 'BACK10',
          option_values: [],
          calculated_price: 10,
          image_url: '',
          has_price_list: false,
          bulk_prices: [],
          purchasing_disabled: false,
          cost_price: 0,
          inventory_level: 0,
          bc_calculated_price: {
            as_entered: 10,
            tax_inclusive: 10,
            tax_exclusive: 10,
            entered_inclusive: false,
          },
        },
      ],
    });

    const validateProduct = vi.fn();
    when(validateProduct)
      .calledWith(
        expect.objectContaining({
          productId: 112,
          variantId: 77,
          quantity: expect.any(Number),
          productOptions: [
            {
              optionId: 113,
              optionValue: 'Test Message',
            },
            {
              optionId: 114,
              optionValue: '42',
            },
          ],
        }),
      )
      .thenReturn({
        data: {
          validateProduct: {
            responseType: 'SUCCESS',
            message: '',
            errorCode: '',
          },
        },
      });

    server.use(
      graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)),
      graphql.query('SearchProducts', () =>
        HttpResponse.json({
          data: {
            productsSearch: [productSearchResult],
          },
        }),
      ),
      graphql.query('getQuoteExtraFields', () =>
        HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
      ),
      graphql.query('ValidateProduct', ({ variables }) =>
        HttpResponse.json(validateProduct(variables)),
      ),
    );

    vitest.mocked(useParams).mockReturnValue({ id: '99999' });

    renderWithProviders(<QuoteDetail />, {
      preloadedState: {
        ...preloadedState,
        global: buildGlobalStateWith({
          backorderEnabled: true,
        }),
      },
    });

    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

    expect(screen.getByText('Product with Required Modifiers')).toBeVisible();
    expect(screen.getByText('Custom Message: Test Message')).toBeVisible();
    expect(screen.getByText('Size: Large')).toBeVisible();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  describe('backorder details toggle', () => {
    const backorderPreloadedState = {
      ...preloadedState,
      global: buildGlobalStateWith({
        backorderEnabled: true,
        backorderDisplaySettings: {
          showQuantityOnBackorder: true,
          showQuantityOnHand: true,
          showBackorderMessage: true,
        },
        featureFlags: {
          'BACK-134.backorders_phase_1_1_control_messaging_on_storefront': true,
        },
      }),
    };

    beforeEach(() => {
      server.use(
        graphql.query('SearchProducts', () =>
          HttpResponse.json(buildProductSearchResponseWith('WHATEVER_VALUES')),
        ),
        graphql.query('getQuoteExtraFields', () =>
          HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
        ),
        graphql.query('ValidateProduct', () =>
          HttpResponse.json({
            data: { validateProduct: { responseType: 'SUCCESS', message: '' } },
          }),
        ),
      );
    });

    it('does not show the toggle when no products have backordered quantities', async () => {
      const quote = buildQuoteWith({
        data: {
          quote: {
            id: '272989',
            productsList: [buildQuoteProductWith({ quantityBackordered: 0 })],
          },
        },
      });

      server.use(graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)));
      vitest.mocked(useParams).mockReturnValue({ id: '272989' });

      renderWithProviders(<QuoteDetail />, { preloadedState: backorderPreloadedState });

      await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

      expect(screen.queryByText(/backorder details/i)).not.toBeInTheDocument();
    });

    it('shows the toggle when at least one product has backordered quantities', async () => {
      const quote = buildQuoteWith({
        data: {
          quote: {
            id: '272989',
            productsList: [buildQuoteProductWith({ quantityBackordered: 3 })],
          },
        },
      });

      server.use(graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)));
      vitest.mocked(useParams).mockReturnValue({ id: '272989' });

      renderWithProviders(<QuoteDetail />, { preloadedState: backorderPreloadedState });

      await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

      expect(await screen.findByText(/backorder details/i)).toBeInTheDocument();
    });

    it('does not show the toggle when backorders are disabled', async () => {
      const quote = buildQuoteWith({
        data: {
          quote: {
            id: '272989',
            productsList: [buildQuoteProductWith({ quantityBackordered: 3 })],
          },
        },
      });

      server.use(graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)));
      vitest.mocked(useParams).mockReturnValue({ id: '272989' });

      renderWithProviders(<QuoteDetail />, {
        preloadedState: {
          ...preloadedState,
          global: buildGlobalStateWith({ backorderEnabled: false }),
        },
      });

      await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

      expect(screen.queryByText(/backorder details/i)).not.toBeInTheDocument();
    });
  });

  describe('fix_quote_currency_symbol_placement feature flag', () => {
    const woolSock = buildQuoteProductWith({
      productName: 'Wool Socks',
      quantity: 3,
      basePrice: '49.00',
      offeredPrice: '49.00',
    });

    const eurOnRightInQuote = {
      token: '€',
      location: 'right',
      currencyCode: 'EUR',
      decimalToken: '.',
      decimalPlaces: 2,
      thousandsToken: ',',
      currencyExchangeRate: '1.0000000000',
    };

    const eurOnLeftInBcConfig = {
      id: '2',
      is_default: false,
      last_updated: '2024-01-01',
      country_iso2: 'DE',
      default_for_country_codes: [],
      currency_code: 'EUR',
      currency_exchange_rate: '1.0000000000',
      name: 'Euro',
      token: '€',
      auto_update: false,
      decimal_token: '.',
      decimal_places: 2,
      enabled: true,
      is_transactional: true,
      token_location: 'left' as const,
      thousands_token: ',',
    };

    const storeConfigsWithUpdatedEurPlacement = {
      currencies: {
        currencies: [eurOnLeftInBcConfig],
        channelCurrencies: { channel_id: 1, enabled_currencies: ['EUR'], default_currency: 'EUR' },
        enteredInclusiveTax: false,
      },
    };

    beforeEach(() => {
      const quote = buildQuoteWith({
        data: {
          quote: {
            id: '272989',
            productsList: [woolSock],
            currency: eurOnRightInQuote,
            totalAmount: '200.00',
          },
        },
      });

      server.use(
        graphql.query('GetQuoteInfoB2B', () => HttpResponse.json(quote)),
        graphql.query('SearchProducts', () =>
          HttpResponse.json(buildProductSearchResponseWith('WHATEVER_VALUES')),
        ),
        graphql.query('getQuoteExtraFields', () =>
          HttpResponse.json(buildQuoteExtraFieldsWith('WHATEVER_VALUES')),
        ),
      );

      vitest.mocked(useParams).mockReturnValue({ id: '272989' });
    });

    it('uses the saved quote currency placement when the flag is disabled', async () => {
      renderWithProviders(<QuoteDetail />, {
        preloadedState: {
          ...preloadedState,
          storeConfigs: storeConfigsWithUpdatedEurPlacement,
          global: buildGlobalStateWith({
            backorderEnabled: false,
            featureFlags: { 'B2B-3876.fix_quote_currency_symbol_placement': false },
          }),
        },
      });

      const row = (await screen.findByText('Wool Socks')).closest('tr')!;
      expect(within(row).getByRole('cell', { name: '4,900.00 %' })).toBeInTheDocument();

      const summary = screen.getByTestId('quote-summary');
      expect(within(summary).getByText('200.00€')).toBeInTheDocument();
    });

    it('uses the current BC currency placement when the flag is enabled', async () => {
      renderWithProviders(<QuoteDetail />, {
        preloadedState: {
          ...preloadedState,
          storeConfigs: storeConfigsWithUpdatedEurPlacement,
          global: buildGlobalStateWith({
            backorderEnabled: false,
            featureFlags: { 'B2B-3876.fix_quote_currency_symbol_placement': true },
          }),
        },
      });

      const row = (await screen.findByText('Wool Socks')).closest('tr')!;
      expect(within(row).getByRole('cell', { name: '4,900.00 %' })).toBeInTheDocument();

      const summary = screen.getByTestId('quote-summary');
      expect(within(summary).getByText('€200.00')).toBeInTheDocument();
    });

    it('places the token on the left when BC config has uppercase token_location LEFT and flag is enabled', async () => {
      const eurWithUppercaseLeft = JSON.parse(
        JSON.stringify({ ...eurOnLeftInBcConfig, token_location: 'LEFT' }),
      );

      renderWithProviders(<QuoteDetail />, {
        preloadedState: {
          ...preloadedState,
          storeConfigs: {
            currencies: {
              currencies: [eurWithUppercaseLeft],
              channelCurrencies: {
                channel_id: 1,
                enabled_currencies: ['EUR'],
                default_currency: 'EUR',
              },
              enteredInclusiveTax: false,
            },
          },
          global: buildGlobalStateWith({
            backorderEnabled: false,
            featureFlags: { 'B2B-3876.fix_quote_currency_symbol_placement': true },
          }),
        },
      });

      const row = (await screen.findByText('Wool Socks')).closest('tr')!;
      expect(within(row).getByRole('cell', { name: '4,900.00 %' })).toBeInTheDocument();

      const summary = screen.getByTestId('quote-summary');
      expect(within(summary).getByText('€200.00')).toBeInTheDocument();
    });
  });
});
