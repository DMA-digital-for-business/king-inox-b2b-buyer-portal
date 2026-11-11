import { builder, faker, http, HttpResponse, startMockServer } from 'tests/test-utils';

import type { QuoteShippingTerms } from '@/types/quotes';

import createOrderFromQuote from './createOrderFromQuote';

const { server } = startMockServer();
const buildRequestWith = builder(() => ({
  quoteId: faker.string.numeric(8),
  createdAt: Math.floor(faker.date.past().getTime() / 1000),
  token: faker.string.alphanumeric(40),
}));

it.each<QuoteShippingTerms>(['porto_franco', 'porto_assegnato', 'porto_franco_con_addebito'])(
  'sends the confirmed %s shipping terms in the quote conversion request',
  async (shippingTerms) => {
    const { quoteId, createdAt, token } = buildRequestWith('WHATEVER_VALUES');
    const receive = vi.fn();
    server.use(
      http.get('*/customer/current.jwt', () => HttpResponse.text(token)),
      http.post('*/api/v1/bigcommerce/quote-checkout', async ({ request }) => {
        expect(request.headers.get('authorization')).toBe(`Bearer ${token}`);
        receive(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await createOrderFromQuote(quoteId, createdAt, shippingTerms);
    expect(receive).toHaveBeenCalledExactlyOnceWith({
      quote_id: Number(quoteId),
      createdAt,
      shipping_terms: shippingTerms,
    });
  },
);

it('keeps the existing payload for callers without shipping terms', async () => {
  const { quoteId, createdAt, token } = buildRequestWith('WHATEVER_VALUES');
  const receive = vi.fn();
  server.use(
    http.get('*/customer/current.jwt', () => HttpResponse.text(token)),
    http.post('*/api/v1/bigcommerce/quote-checkout', async ({ request }) => {
      receive(await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
  );
  await createOrderFromQuote(quoteId, createdAt);
  expect(receive).toHaveBeenCalledExactlyOnceWith({ quote_id: Number(quoteId), createdAt });
});

it('reports a rejected conversion', async () => {
  const { quoteId, createdAt, token } = buildRequestWith('WHATEVER_VALUES');
  server.use(
    http.get('*/customer/current.jwt', () => HttpResponse.text(token)),
    http.post('*/api/v1/bigcommerce/quote-checkout', () => new HttpResponse(null, { status: 400 })),
  );
  await expect(createOrderFromQuote(quoteId, createdAt, 'porto_assegnato')).rejects.toThrow(
    'Unable to create order from quote (400)',
  );
});
