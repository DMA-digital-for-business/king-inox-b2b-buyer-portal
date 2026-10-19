import { builder, faker, graphql, HttpResponse, startMockServer } from 'tests/test-utils';

import { pdfExtraField, quotePdfDelivery } from './quotePdfData';
import { fetchQuotePdfVariants } from './useQuotePdfResources';

const { server } = startMockServer();
const buildStockWith = builder(() => ({
  STOCK: String(faker.number.int({ min: 0, max: 10 })),
  QTA_REFILL: String(faker.number.int({ min: 1, max: 10 })),
  DATA_REFILL: faker.date.future().toISOString().slice(0, 10),
}));
const buildTargetWith = builder(() => ({
  productId: faker.number.int({ min: 1, max: 10000 }),
  variantId: faker.number.int({ min: 1, max: 10000 }),
}));
const buildFieldWith = builder(() => ({
  fieldName: faker.lorem.word(),
  fieldValue: faker.string.alphanumeric(),
}));

describe('quote PDF resources', () => {
  it('shows ready stock when the entire requested quantity is available', () => {
    const stock = buildStockWith('WHATEVER_VALUES');
    expect(quotePdfDelivery(stock, Number(stock.STOCK))).toBe('ready');
  });

  it('uses the refill date only when stock plus refill covers the request', () => {
    const stock = buildStockWith('WHATEVER_VALUES');
    const total = Number(stock.STOCK) + Number(stock.QTA_REFILL);
    expect(quotePdfDelivery(stock, total)).toBe(stock.DATA_REFILL);
    expect(quotePdfDelivery(stock, total + 1)).toBeUndefined();
  });

  it('does not infer stock or a delivery date from missing or invalid values', () => {
    const stock = buildStockWith({ STOCK: '0', QTA_REFILL: '100', DATA_REFILL: '2026-02-30' });
    expect(quotePdfDelivery(stock, 1)).toBeUndefined();
    expect(quotePdfDelivery({}, 1)).toBeUndefined();
    expect(quotePdfDelivery({ ...stock, STOCK: '', DATA_REFILL: '2026-11-30' }, 1)).toBeUndefined();
  });

  it('shows on request only when both stock and refill quantities are non-positive', () => {
    const stock = buildStockWith({ STOCK: '0', QTA_REFILL: '0' });
    expect(quotePdfDelivery(stock, 1)).toBe('onRequest');
    expect(quotePdfDelivery({ ...stock, STOCK: '-1', QTA_REFILL: '-2' }, 1)).toBe('onRequest');
    expect(quotePdfDelivery({ ...stock, STOCK: '1' }, 2)).toBeUndefined();
    expect(quotePdfDelivery({ ...stock, QTA_REFILL: '1' }, 2)).toBeUndefined();
  });

  it('reads named company and address fields without substituting unrelated fields', () => {
    const code = buildFieldWith({ fieldName: 'CODICE CLIENTE ERP' });
    const field = buildFieldWith('WHATEVER_VALUES');
    expect(pdfExtraField([field, code], 'CODICE CLIENTE ERP')).toBe(code.fieldValue);
    expect(pdfExtraField([field], 'SPEDIZIONE')).toBeUndefined();
  });

  it('fetches packaging, dimensions and stock for each unique variant', async () => {
    const target = buildTargetWith('WHATEVER_VALUES');
    const measure = buildFieldWith({ fieldName: 'MISURA' });
    const sku = faker.string.alphanumeric();
    let requests = 0;
    server.use(
      graphql.query('GetQuotePdfVariants', ({ query }) => {
        requests += 1;
        expect(query).toContain('namespace: "packaging"');
        expect(query).toContain('namespace: "dimensions"');
        expect(query).toContain('namespace: "stock"');
        expect(query.match(/product\(entityId:/g)).toHaveLength(1);
        return HttpResponse.json({
          data: {
            site: {
              p0: {
                variants: {
                  edges: [
                    {
                      node: {
                        entityId: target.variantId,
                        sku,
                        dimensions: {
                          edges: [{ node: { key: measure.fieldName, value: measure.fieldValue } }],
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
    );
    const variants = await fetchQuotePdfVariants([target, target]);
    expect(requests).toBe(1);
    expect(variants[target.variantId]).toEqual({
      sku,
      dimensions: { MISURA: measure.fieldValue },
      stock: {},
      packaging: {},
    });
  });

  it('reports query errors instead of exporting incomplete resources', async () => {
    server.use(
      graphql.query('GetQuotePdfVariants', () =>
        HttpResponse.json({ errors: [{ message: 'Unavailable' }] }),
      ),
    );
    await expect(fetchQuotePdfVariants([buildTargetWith('WHATEVER_VALUES')])).rejects.toThrow();
  });
});
