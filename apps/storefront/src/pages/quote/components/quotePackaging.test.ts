import { Product } from '@/types';
import { QuoteItem } from '@/types/quotes';

import { normalizeQuantityToBoxMultiple, normalizeQuantityToBoxStep } from './quotePackaging';

const lineItemWithBoxPackaging: QuoteItem['node'] = {
  id: 'item-1',
  optionList: '[]',
  calculatedValue: {},
  basePrice: 10,
  taxPrice: 0,
  quantity: 1,
  variantId: 2,
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
          ],
        },
      },
    ],
  } as unknown as Product,
};

describe('quotePackaging', () => {
  it('rounds quantity up to the next Box multiple', () => {
    expect(normalizeQuantityToBoxMultiple(lineItemWithBoxPackaging, 101)).toBe(200);
  });

  it('keeps quantity unchanged when already a Box multiple', () => {
    expect(normalizeQuantityToBoxMultiple(lineItemWithBoxPackaging, 200)).toBe(200);
  });

  it('rounds quantity down to the previous Box multiple when decreasing', () => {
    expect(normalizeQuantityToBoxStep(lineItemWithBoxPackaging, 199, 200)).toBe(100);
  });
});
