import {
  buildCompanyStateWith,
  builder,
  faker,
  http,
  HttpResponse,
  startMockServer,
} from 'tests/test-utils';

import { setupStore } from '@/store';
import * as storeModule from '@/store';
import { CustomerRole } from '@/types';

import { gotoAllowedAppPage } from '.';

const { server } = startMockServer();

function restoreCustomer(role: CustomerRole) {
  const company = buildCompanyStateWith({
    customer: { id: faker.number.int({ min: 1 }), emailAddress: faker.internet.email(), role },
    tokens: { B2BToken: faker.string.uuid() },
  });
  vi.spyOn(storeModule, 'store', 'get').mockReturnValue(setupStore({ company }));
}

describe('Opening a portal page after refresh', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it.each([
    CustomerRole.ADMIN,
    CustomerRole.SENIOR_BUYER,
    CustomerRole.JUNIOR_BUYER,
    CustomerRole.SUPER_ADMIN,
    CustomerRole.SUPER_ADMIN_BEFORE_AGENCY,
    CustomerRole.CUSTOM_ROLE,
    CustomerRole.B2C,
  ])('opens documents directly for authenticated role %i and preserves filters', async (role) => {
    restoreCustomer(role);
    window.location.hash = '#/documents?tipoDoc=orders&offset=10';
    server.use(
      http.get(`${window.origin}/customer/current.jwt`, () =>
        HttpResponse.text(faker.string.uuid()),
      ),
    );
    const openPage = vi.fn();

    await gotoAllowedAppPage(role, openPage);

    expect(openPage).toHaveBeenCalledExactlyOnceWith('/documents?tipoDoc=orders&offset=10');
  });

  it('redirects to login when the customer session has expired', async () => {
    restoreCustomer(CustomerRole.ADMIN);
    window.location.hash = '#/documents';
    const error = builder(() => ({ errors: [faker.lorem.sentence()] }))('WHATEVER_VALUES');
    server.use(
      http.get(`${window.origin}/customer/current.jwt`, () =>
        HttpResponse.json(error, { status: 401 }),
      ),
    );
    const openPage = vi.fn();

    await gotoAllowedAppPage(CustomerRole.ADMIN, openPage);

    expect(openPage).toHaveBeenCalledExactlyOnceWith('/login?loginFlag=deviceCrowdingLogIn');
  });

  it('continues to reject a restricted page for an unauthorized role', async () => {
    restoreCustomer(CustomerRole.B2C);
    window.location.hash = '#/dashboard';
    server.use(
      http.get(`${window.origin}/customer/current.jwt`, () =>
        HttpResponse.text(faker.string.uuid()),
      ),
    );
    const openPage = vi.fn();

    await gotoAllowedAppPage(CustomerRole.B2C, openPage);

    expect(openPage).not.toHaveBeenCalled();
  });
});
