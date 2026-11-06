import {
  builder,
  bulk,
  delay,
  faker,
  graphql,
  HttpResponse,
  startMockServer,
} from 'tests/test-utils';

import { getQuotePdfCustomCode, pdfExtraField, quotePdfDelivery } from './quotePdfData';
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
        expect(query).not.toContain('namespace: "customCodes"');
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

  it('loads every variant of a large quote without exceeding the query complexity limit', async () => {
    const firstTarget = buildTargetWith('WHATEVER_VALUES');
    const targets = bulk(buildTargetWith, 'WHATEVER_VALUES')
      .times(23)
      .map((target, index) => ({
        ...target,
        variantId: firstTarget.variantId + index,
      }));
    const oracleId = faker.string.numeric(8);
    const code = faker.string.uuid();
    const field = buildFieldWith('WHATEVER_VALUES');
    let activeRequests = 0;
    let maxActiveRequests = 0;
    let requests = 0;
    server.use(
      graphql.query('GetQuotePdfVariants', async ({ query }) => {
        const selections = [
          ...query.matchAll(
            /p(\d+): product\(entityId: \d+\)\s*\{\s*variants\(entityIds: \[(\d+)\]/g,
          ),
        ];
        requests += 1;
        if (selections.length * 811 > 10000) {
          return HttpResponse.json({ errors: [{ message: 'The query is too complex' }] });
        }
        activeRequests += 1;
        maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
        await delay(20);
        activeRequests -= 1;
        const metafields = { edges: [{ node: { key: field.fieldName, value: field.fieldValue } }] };
        return HttpResponse.json({
          data: {
            site: Object.fromEntries(
              selections.map(([, alias, id]) => [
                `p${alias}`,
                {
                  variants: {
                    edges: [
                      {
                        node: {
                          entityId: Number(id),
                          packaging: metafields,
                          dimensions: metafields,
                          stock: metafields,
                          customCodes: {
                            edges: [
                              { node: { key: 'CUSTOM_CODES', value: `${oracleId}=${code}` } },
                            ],
                          },
                        },
                      },
                    ],
                  },
                },
              ]),
            ),
          },
        });
      }),
    );

    const variants = await fetchQuotePdfVariants([...targets, targets[0]], oracleId);
    expect(Object.keys(variants)).toHaveLength(targets.length);
    targets.forEach(({ variantId }) => {
      expect(variants[variantId]).toEqual({
        packaging: { [field.fieldName]: field.fieldValue },
        dimensions: { [field.fieldName]: field.fieldValue },
        stock: { [field.fieldName]: field.fieldValue },
        yourCode: code,
      });
    });
    expect(requests).toBeGreaterThan(1);
    expect(maxActiveRequests).toBeLessThanOrEqual(3);
  });

  it('selects the variant customer code using the Oracle company identifier', async () => {
    const target = buildTargetWith('WHATEVER_VALUES');
    const oracleId = `00${faker.string.numeric(6)}`;
    const code = faker.string.uuid();
    const unrelatedId = `${oracleId}-other`;
    server.use(
      graphql.query('GetQuotePdfVariants', ({ query }) => {
        expect(query).toContain('namespace: "customCodes", keys: ["CUSTOM_CODES"], first: 1');
        return HttpResponse.json({
          data: {
            site: {
              p0: {
                variants: {
                  edges: [
                    {
                      node: {
                        entityId: target.variantId,
                        customCodes: {
                          edges: [
                            {
                              node: {
                                key: 'CUSTOM_CODES',
                                value: `${unrelatedId}=OTHER|${oracleId}=${code}`,
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
    );
    const variants = await fetchQuotePdfVariants([target], oracleId);
    expect(variants[target.variantId].yourCode).toBe(code);
  });

  it('does not substitute another company code when its identifier is absent from CUSTOM_CODES', async () => {
    const target = buildTargetWith('WHATEVER_VALUES');
    const oracleId = `00${faker.string.numeric(6)}`;
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
                        entityId: target.variantId,
                        customCodes: {
                          edges: [
                            {
                              node: {
                                key: 'CUSTOM_CODES',
                                value: `${oracleId}-other=${faker.string.uuid()}`,
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
        }),
      ),
    );
    const variants = await fetchQuotePdfVariants([target], oracleId);
    expect(variants[target.variantId].yourCode).toBeUndefined();
  });

  it('parses the theme format with spaces, malformed entries and equals signs in the code', () => {
    const companyId = `00${faker.string.numeric(6)}`;
    const code = `${faker.string.uuid()}=suffix`;
    const value = `invalid | ${companyId}-other=OTHER | ${companyId} =  | ${companyId} = ${code} | ${companyId}=LATER`;
    expect(getQuotePdfCustomCode(value, ` ${companyId} `)).toBe(code);
    expect(getQuotePdfCustomCode(value, undefined)).toBeUndefined();
    expect(getQuotePdfCustomCode(undefined, companyId)).toBeUndefined();
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
