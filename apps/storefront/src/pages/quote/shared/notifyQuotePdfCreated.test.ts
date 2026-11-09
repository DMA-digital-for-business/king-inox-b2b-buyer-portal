import { builder, faker, http, HttpResponse, startMockServer } from 'tests/test-utils';

import notifyQuotePdfCreated from './notifyQuotePdfCreated';

const { server } = startMockServer();
const buildRequestWith = builder(() => ({
  quoteId: faker.string.numeric(8),
  createdAt: Math.floor(faker.date.past().getTime() / 1000),
  token: faker.string.alphanumeric(40),
}));
let token: string;

const DEV_API = 'https://1k4mxza2e2.execute-api.eu-central-1.amazonaws.com/dev';
const STAGING_API = 'https://rtpc12l9k0.execute-api.eu-central-1.amazonaws.com/sandbox';

beforeEach(() => {
  vi.stubGlobal('__RUNTIME_STOREFRONT_ENV__', undefined);
  ({ token } = buildRequestWith('WHATEVER_VALUES'));
  server.use(http.get('*/customer/current.jwt', () => HttpResponse.text(token)));
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.body.dataset.storeBaseUrl;
});

it.each([
  ['king-inox.mybigcommerce.com', DEV_API],
  ['king-inox-en-1874693.mybigcommerce.com', DEV_API],
  ['king-spa-b2b-sandbox-1.mybigcommerce.com', STAGING_API],
  ['king-spa---b2b-sandbox-1---english-1878633.mybigcommerce.com', STAGING_API],
  ['www.king-inox.it', STAGING_API],
])('notifies PDF creation using the API for %s', async (hostname, apiDomain) => {
  const { quoteId, createdAt } = buildRequestWith('WHATEVER_VALUES');
  document.body.dataset.storeBaseUrl = `https://${hostname}`;
  const notify = vi.fn();
  server.use(
    http.post(`${apiDomain}/api/v1/bigcommerce/quote-pdf-created`, async ({ request }) => {
      expect(request.headers.get('content-type')).toBe('application/json');
      expect(request.headers.get('authorization')).toBe(`Bearer ${token}`);
      notify(await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
  );

  await notifyQuotePdfCreated(quoteId, createdAt);
  expect(notify).toHaveBeenCalledExactlyOnceWith({ quote_id: Number(quoteId), createdAt });
});

it.each([
  ['dev', DEV_API],
  ['staging', STAGING_API],
  ['prod', STAGING_API],
])(
  'uses the explicit %s environment before the storefront hostname',
  async (environment, apiDomain) => {
    const { quoteId, createdAt } = buildRequestWith('WHATEVER_VALUES');
    vi.stubGlobal('__RUNTIME_STOREFRONT_ENV__', environment);
    document.body.dataset.storeBaseUrl = 'https://king-inox.mybigcommerce.com';
    server.use(
      http.get('*/customer/current.jwt', ({ request }) => {
        expect(new URL(request.url).searchParams.get('app_client_id')).toBe(
          environment === 'dev'
            ? 'g6gl9yq2dmanydpcmabfyik10wj6dxf'
            : 'ooty5p0sanjii578e42z4mqbjj527av',
        );
        return HttpResponse.text(token);
      }),
      http.post(
        `${apiDomain}/api/v1/bigcommerce/quote-pdf-created`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    await expect(notifyQuotePdfCreated(quoteId, createdAt)).resolves.toBeUndefined();
  },
);

it('reports a failed notification', async () => {
  const { quoteId, createdAt } = buildRequestWith('WHATEVER_VALUES');
  vi.stubGlobal('__RUNTIME_STOREFRONT_ENV__', 'staging');
  server.use(
    http.post(
      `${STAGING_API}/api/v1/bigcommerce/quote-pdf-created`,
      () => new HttpResponse(null, { status: 503 }),
    ),
  );
  await expect(notifyQuotePdfCreated(quoteId, createdAt)).rejects.toThrow(
    'Unable to notify quote PDF creation (503)',
  );
});

it.each([401, 200])('does not notify when the customer JWT is unavailable (%s)', async (status) => {
  const { quoteId, createdAt } = buildRequestWith('WHATEVER_VALUES');
  const notify = vi.fn();
  server.use(
    http.get('*/customer/current.jwt', () => HttpResponse.text('', { status })),
    http.post('*/api/v1/bigcommerce/quote-pdf-created', () => {
      notify();
      return new HttpResponse(null, { status: 204 });
    }),
  );
  await expect(notifyQuotePdfCreated(quoteId, createdAt)).rejects.toThrow();
  expect(notify).not.toHaveBeenCalled();
});
