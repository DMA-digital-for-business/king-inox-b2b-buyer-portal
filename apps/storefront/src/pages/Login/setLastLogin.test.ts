import { builder, faker, http, HttpResponse, startMockServer } from 'tests/test-utils';

import { getCurrentApiClientId, getCurrentApiDomain } from '@/shared/service/kingInox/apiDomain';
import b2bLogger from '@/utils/b3Logger';

import { setLastLogin } from './setLastLogin';

const { server } = startMockServer();
const buildSessionWith = builder(() => ({ token: faker.string.alphanumeric(100) }));

describe('last login notification', () => {
  beforeEach(() => {
    vi.spyOn(b2bLogger, 'error').mockImplementation(() => {});
  });

  it('gets a fresh current customer JWT and sends it without a request body', async () => {
    const { token } = buildSessionWith('WHATEVER_VALUES');
    const notified = vi.fn();
    server.use(
      http.get('*/customer/current.jwt', ({ request }) => {
        expect(new URL(request.url).searchParams.get('app_client_id')).toBe(
          getCurrentApiClientId(),
        );
        return HttpResponse.text(token);
      }),
      http.post(
        `${getCurrentApiDomain()}/api/v1/bigcommerce/set-last-login`,
        async ({ request }) => {
          expect(request.headers.get('Authorization')).toBe(`Bearer ${token}`);
          expect(await request.text()).toBe('');
          notified();
          return HttpResponse.json({ success: true });
        },
      ),
    );

    await setLastLogin();

    expect(notified).toHaveBeenCalledOnce();
    expect(b2bLogger.error).not.toHaveBeenCalled();
  });

  it.each(['HTTP error', 'network error', 'missing JWT', 'JWT request error'])(
    'logs %s without rejecting the login flow',
    async (failure) => {
      const { token } = buildSessionWith('WHATEVER_VALUES');
      const notified = vi.fn();
      server.use(
        http.get('*/customer/current.jwt', () => {
          if (failure === 'JWT request error') return HttpResponse.error();
          return HttpResponse.text(failure === 'missing JWT' ? '' : token);
        }),
        http.post(`${getCurrentApiDomain()}/api/v1/bigcommerce/set-last-login`, () => {
          notified();
          return failure === 'network error'
            ? HttpResponse.error()
            : new HttpResponse(null, { status: 500 });
        }),
      );

      await expect(setLastLogin()).resolves.toBeUndefined();

      expect(b2bLogger.error).toHaveBeenCalledWith('Failed to set last login:', expect.any(Error));
      if (failure === 'missing JWT' || failure === 'JWT request error') {
        expect(notified).not.toHaveBeenCalled();
      }
    },
  );
});
