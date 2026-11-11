import { ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import {
  builder,
  faker,
  graphql,
  http,
  HttpResponse,
  renderWithProviders,
  screen,
  startMockServer,
  userEvent,
  waitFor,
  within,
} from 'tests/test-utils';

import type { ShippingAddress } from '@/types/quotes';

import ConvertToOrderDialog from './index';

const { server } = startMockServer();
const buildAddressWith = builder<ShippingAddress>(() => ({
  addressId: faker.number.int({ min: 1, max: 10000 }),
  address: faker.location.streetAddress(),
  apartment: '',
  city: faker.location.city(),
  companyName: faker.company.name(),
  country: faker.location.country(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  label: faker.company.name(),
  phoneNumber: faker.phone.number(),
  state: faker.location.state(),
  zipCode: faker.location.zipCode(),
}));
const buildScenarioWith = builder(() => ({
  address: buildAddressWith('WHATEVER_VALUES'),
  companyId: faker.number.int({ min: 1, max: 10000 }),
  total: faker.number.int({ min: 100, max: 500 }),
  threshold: faker.number.int({ min: 600, max: 1000 }),
  orders: faker.number.int({ min: 1, max: 50 }),
  token: faker.string.alphanumeric(40),
}));
let scenario: ReturnType<typeof buildScenarioWith>;
let convert: ReturnType<typeof vi.fn>;

function renderDialog(overrides: Partial<ComponentProps<typeof ConvertToOrderDialog>> = {}) {
  return renderWithProviders(
    <ConvertToOrderDialog
      companyId={scenario.companyId}
      address={scenario.address}
      total={scenario.total}
      currencyCode="EUR"
      busy={overrides.busy ?? false}
      onClose={overrides.onClose ?? vi.fn()}
      onConfirm={convert}
    />,
  );
}

beforeEach(() => {
  scenario = buildScenarioWith('WHATEVER_VALUES');
  convert = vi.fn().mockResolvedValue(undefined);
  server.use(
    graphql.query('QuoteConversionAddresses', () =>
      HttpResponse.json({
        data: {
          addresses: {
            edges: [
              {
                node: {
                  id: scenario.address.addressId,
                  extraFields: [
                    { fieldName: 'SOGLIA PORTOFRANCO', fieldValue: String(scenario.threshold) },
                  ],
                },
              },
            ],
            pageInfo: { hasNextPage: false },
          },
        },
      }),
    ),
    http.get('*/customer/current.jwt', () => HttpResponse.text(scenario.token)),
    http.get('*/api/v1/bigcommerce/order-status', ({ request }) => {
      expect(request.headers.get('authorization')).toBe(`Bearer ${scenario.token}`);
      return HttpResponse.json({
        data: [
          { amount_shipped_next_7_days: String(scenario.orders) },
          { amount_shipped_next_7_days: null },
        ],
      });
    }),
  );
});

it('requires an explicit choice below the threshold and only converts after confirmation', async () => {
  const user = userEvent.setup();
  renderDialog();
  const confirm = screen.getByRole('button', { name: 'Continue converting to order' });
  expect(confirm).toBeDisabled();
  await user.click(await screen.findByRole('combobox', { name: /Shipping terms/ }));
  expect(convert).not.toHaveBeenCalled();
  await user.click(screen.getByRole('option', { name: 'Freight collect' }));
  await user.click(confirm);
  expect(convert).toHaveBeenCalledExactlyOnceWith('porto_assegnato');
});

it('allows prepaid freight charged to the customer', async () => {
  const user = userEvent.setup();
  renderDialog();
  await user.click(await screen.findByRole('combobox', { name: /Shipping terms/ }));
  await user.click(screen.getByRole('option', { name: 'Prepaid freight charged to customer' }));
  await user.click(screen.getByRole('button', { name: 'Continue converting to order' }));
  expect(convert).toHaveBeenCalledExactlyOnceWith('porto_franco_con_addebito');
});

it.each(['equal', 'above'])(
  'automatically applies free shipping when the combined total is %s to the threshold',
  async (condition) => {
    scenario.orders = scenario.threshold - scenario.total + (condition === 'above' ? 1 : 0);
    const user = userEvent.setup();
    renderDialog();
    await screen.findByText('Threshold reached: free shipping will be applied.');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(convert).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Continue converting to order' }));
    expect(convert).toHaveBeenCalledExactlyOnceWith('porto_franco');
  },
);

it('offers transport choices when the address has no free shipping threshold', async () => {
  server.use(
    graphql.query('QuoteConversionAddresses', () =>
      HttpResponse.json({
        data: {
          addresses: {
            edges: [{ node: { id: scenario.address.addressId, extraFields: [] } }],
            pageInfo: { hasNextPage: false },
          },
        },
      }),
    ),
  );
  renderDialog();
  await screen.findByRole('combobox', { name: /Shipping terms/ });
  expect(screen.getByRole('button', { name: 'Continue converting to order' })).toBeDisabled();
});

it('blocks conversion on an order lookup error and allows retry', async () => {
  server.use(
    http.get('*/api/v1/bigcommerce/order-status', () => new HttpResponse(null, { status: 503 })),
  );
  const user = userEvent.setup();
  renderDialog();
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Continue converting to order' })).toBeDisabled();
  server.use(http.get('*/api/v1/bigcommerce/order-status', () => HttpResponse.json({ data: [] })));
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByRole('combobox', { name: /Shipping terms/ });
  expect(convert).not.toHaveBeenCalled();
});

it('blocks conversion when the saved shipping address cannot be found', async () => {
  server.use(
    graphql.query('QuoteConversionAddresses', () =>
      HttpResponse.json({
        data: {
          addresses: {
            edges: [],
            pageInfo: { hasNextPage: false },
          },
        },
      }),
    ),
  );
  renderDialog();
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Continue converting to order' })).toBeDisabled();
});

it('cancels without converting', async () => {
  const onClose = vi.fn();
  const user = userEvent.setup();
  renderDialog({ onClose });
  await screen.findByRole('combobox');
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onClose).toHaveBeenCalledOnce();
  expect(convert).not.toHaveBeenCalled();
});

it('disables confirmation and cancellation while conversion is in progress', async () => {
  scenario.orders = scenario.threshold;
  renderDialog({ busy: true });
  await screen.findByText('Threshold reached: free shipping will be applied.');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Continue converting to order' })).toBeDisabled(),
  );
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
});

it('recognizes a localized threshold and includes orders down to the cent', async () => {
  scenario.total = 999.89;
  scenario.orders = 0.11;
  server.use(
    graphql.query('QuoteConversionAddresses', () =>
      HttpResponse.json({
        data: {
          addresses: {
            edges: [
              {
                node: {
                  id: scenario.address.addressId,
                  extraFields: [{ fieldName: ' soglia portofranco ', fieldValue: '€ 1.000,00' }],
                },
              },
            ],
            pageInfo: { hasNextPage: false },
          },
        },
      }),
    ),
  );
  renderDialog();
  await screen.findByText('Threshold reached: free shipping will be applied.');
  expect(screen.getByRole('button', { name: 'Continue converting to order' })).toBeEnabled();
});

it('recognizes a zero free shipping threshold', async () => {
  scenario.threshold = 0;
  renderDialog();
  await screen.findByText('Threshold reached: free shipping will be applied.');
});

it('finds shipping terms on a later address page', async () => {
  server.use(
    graphql.query('QuoteConversionAddresses', ({ query }) =>
      HttpResponse.json({
        data: {
          addresses: {
            edges: [
              {
                node: {
                  id: query.includes('offset: 0')
                    ? scenario.address.addressId + 1
                    : scenario.address.addressId,
                  extraFields: [],
                },
              },
            ],
            pageInfo: { hasNextPage: query.includes('offset: 0') },
          },
        },
      }),
    ),
  );
  renderDialog();
  await screen.findByRole('combobox', { name: /Shipping terms/ });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('blocks confirmation when an order contains an invalid shipping amount', async () => {
  server.use(
    http.get('*/api/v1/bigcommerce/order-status', () =>
      HttpResponse.json({ data: [{ amount_shipped_next_7_days: faker.lorem.word() }] }),
    ),
  );
  renderDialog();
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Continue converting to order' })).toBeDisabled();
});

it('opens the confirmation and transport menu inside the buyer portal iframe', async () => {
  const frame = document.createElement('iframe');
  document.body.appendChild(frame);
  const frameDocument = frame.contentDocument;
  if (!frameDocument) throw new Error('Portal iframe document unavailable');
  const portalScreen = within(frameDocument.body);
  const user = userEvent.setup({ document: frameDocument });
  const { result } = renderWithProviders(
    createPortal(
      <ConvertToOrderDialog
        companyId={scenario.companyId}
        address={scenario.address}
        total={scenario.total}
        currencyCode="EUR"
        busy={false}
        onClose={vi.fn()}
        onConfirm={convert}
      />,
      frameDocument.body,
    ),
  );
  try {
    const dialog = await portalScreen.findByRole('dialog', { name: 'Confirm conversion to order' });
    expect(dialog).toBeVisible();
    expect(dialog.ownerDocument).toBe(frameDocument);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(await portalScreen.findByRole('combobox', { name: /Shipping terms/ }));
    const option = await portalScreen.findByRole('option', { name: 'Freight collect' });
    expect(option.ownerDocument).toBe(frameDocument);
    await user.click(option);
    await user.click(portalScreen.getByRole('button', { name: 'Continue converting to order' }));
    expect(convert).toHaveBeenCalledExactlyOnceWith('porto_assegnato');
  } finally {
    result.unmount();
    frame.remove();
  }
});
