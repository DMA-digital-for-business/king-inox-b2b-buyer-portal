import { buildGlobalStateWith, renderWithProviders, screen } from 'tests/test-utils';
import { vi } from 'vitest';

import { Product } from '@/types';
import { QuoteItem } from '@/types/quotes';

import QuoteTable from './QuoteTable';

const lineItemWithBackorder: QuoteItem = {
  node: {
    id: 'item-1',
    optionList: '[]',
    calculatedValue: {},
    basePrice: 10,
    taxPrice: 0,
    quantity: 10,
    variantSku: 'V1',
    productName: 'Test product',
    productsSearch: {
      inventoryTracking: 'product',
      totalOnHand: 3,
      availableToSell: 10,
      unlimitedBackorder: false,
      backorderMessage: 'Restock soon',
    } as unknown as Product,
  },
};

const lineItemWithPackagingMetafields: QuoteItem = {
  node: {
    id: 'item-2',
    optionList: '[]',
    calculatedValue: {},
    basePrice: 10,
    taxPrice: 0,
    quantity: 1,
    variantSku: 'V2',
    productName: 'Packaging product',
    productsSearch: {
      variants: [
        {
          variant_id: 2,
          product_id: 20,
          sku: 'V2',
          option_values: [],
          calculated_price: 10,
          image_url: '',
          has_price_list: false,
          bulk_prices: [],
          purchasing_disabled: false,
          inventory_level: 0,
          available_to_sell: 0,
          unlimited_backorder: false,
          bc_calculated_price: {
            as_entered: 10,
            tax_exclusive: 10,
            tax_inclusive: 10,
            entered_inclusive: false,
          },
          packagingMetafields: {
            edges: [
              {
                node: {
                  id: 'mf-1',
                  entityId: 1,
                  key: 'SCATOLA',
                  value: '100',
                },
              },
              {
                node: {
                  id: 'mf-2',
                  entityId: 2,
                  key: 'MASTER_CARTON',
                  value: '2200',
                },
              },
              {
                node: {
                  id: 'mf-3',
                  entityId: 3,
                  key: 'PALLET',
                  value: '86400',
                },
              },
            ],
          },
        },
      ],
    } as unknown as Product,
  },
};

const withBackorderContextAndMessaging = (featureEnabled: boolean) => ({
  preloadedState: {
    global: buildGlobalStateWith({
      backorderEnabled: true,
      backorderDisplaySettings: {
        showQuantityOnBackorder: true,
        showQuantityOnHand: false,
        showBackorderMessage: false,
        showDefaultShippingExpectationPrompt: false,
        defaultShippingExpectationPrompt: '',
      },
      featureFlags: {
        'BACK-134.backorders_phase_1_1_control_messaging_on_storefront': featureEnabled,
      },
    }),
  },
});

describe('QuoteTable backorder messaging', () => {
  it('shows the backorder details toggle when items are backordered for display and messaging is enabled', () => {
    const updateSummary = vi.fn();
    renderWithProviders(
      <QuoteTable total={1} items={[lineItemWithBackorder]} updateSummary={updateSummary} />,
      withBackorderContextAndMessaging(true),
    );

    expect(screen.getByText('Backorder details')).toBeInTheDocument();
  });

  it('hides the backorder details toggle when storefront backorder messaging is disabled, even with backordered items', () => {
    const updateSummary = vi.fn();
    renderWithProviders(
      <QuoteTable total={1} items={[lineItemWithBackorder]} updateSummary={updateSummary} />,
      withBackorderContextAndMessaging(false),
    );

    expect(screen.queryByText('Backorder details')).not.toBeInTheDocument();
  });

  it('displays packaging metafield columns and values for each product row', () => {
    const updateSummary = vi.fn();

    renderWithProviders(
      <QuoteTable
        total={1}
        items={[lineItemWithPackagingMetafields]}
        updateSummary={updateSummary}
      />,
      withBackorderContextAndMessaging(false),
    );

    expect(screen.getByText('Box')).toBeInTheDocument();
    expect(screen.getByText('M. Carton')).toBeInTheDocument();
    expect(screen.getByText('Pallet')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('2200')).toBeInTheDocument();
    expect(screen.getByText('86400')).toBeInTheDocument();
  });
});
