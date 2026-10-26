import { buildCompanyStateWith, builder, renderWithProviders, screen } from 'tests/test-utils';

import { GlobalState } from '@/shared/global/context/config';
import { newPermissions } from '@/shared/routes/config';
import { CompanyStatus, CustomerRole, UserTypes } from '@/types';

import B3Nav from './B3Nav';

const buildShoppingListContextWith = builder<Partial<GlobalState>>(() => ({
  storefrontConfig: { shoppingLists: true, tradeProfessionalApplication: false },
  quoteConfig: [],
}));

const buildShoppingListCompanyWith = () =>
  buildCompanyStateWith({
    companyInfo: { status: CompanyStatus.APPROVED },
    customer: { role: CustomerRole.ADMIN, userType: UserTypes.MULTIPLE_B2C },
    permissions: [{ code: newPermissions.shoppingListsPermissionCodes, permissionLevel: 3 }],
  });

describe('Shopping lists navigation', () => {
  it('displays shopping lists for an authorized B2B buyer without product page configuration', () => {
    renderWithProviders(<B3Nav />, {
      preloadedState: { company: buildShoppingListCompanyWith() },
      initialGlobalContext: buildShoppingListContextWith('WHATEVER_VALUES'),
    });

    expect(screen.getByText('Shopping lists')).toBeInTheDocument();
  });

  it('hides shopping lists when the feature is disabled', () => {
    renderWithProviders(<B3Nav />, {
      preloadedState: { company: buildShoppingListCompanyWith() },
      initialGlobalContext: buildShoppingListContextWith({
        storefrontConfig: { shoppingLists: false },
      }),
    });

    expect(screen.queryByText('Shopping lists')).not.toBeInTheDocument();
  });

  it('hides shopping lists from a B2B buyer without viewing permission', () => {
    const company = buildShoppingListCompanyWith();
    company.permissions = [];

    renderWithProviders(<B3Nav />, {
      preloadedState: { company },
      initialGlobalContext: buildShoppingListContextWith('WHATEVER_VALUES'),
    });

    expect(screen.queryByText('Shopping lists')).not.toBeInTheDocument();
  });
});
