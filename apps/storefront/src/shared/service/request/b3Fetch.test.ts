import { buildCompanyStateWith, builder, faker } from 'tests/test-utils';

import * as storeModule from '@/store';

import B3Request from './b3Fetch';
import { getAPIBaseURL, RequestType } from './base';
import b3Fetch from './fetch';

vi.mock('./fetch', () => ({ default: vi.fn() }));

it('sends a parameterized B2B GET to the B2B API with its authentication headers', async () => {
  const token = faker.string.uuid();
  const response = builder(() => ({ code: 200, data: { list: [] } }))('WHATEVER_VALUES');
  const testStore = storeModule.setupStore({
    company: buildCompanyStateWith({ tokens: { B2BToken: token } }),
  });
  vi.spyOn(storeModule, 'store', 'get').mockReturnValue(testStore);
  vi.mocked(b3Fetch).mockResolvedValue(response);

  await expect(
    B3Request.get('/api/v2/rfq', RequestType.B2BRest, { limit: 10, offset: 0 }, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ).resolves.toEqual(response);

  expect(b3Fetch).toHaveBeenCalledWith(
    `${getAPIBaseURL()}/api/v2/rfq?limit=10&offset=0`,
    expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({ Authorization: `Bearer ${token}`, authToken: token }),
    }),
  );
});
