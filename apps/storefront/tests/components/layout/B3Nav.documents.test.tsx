import { buildCompanyStateWith } from 'tests/storeStateBuilders/companyStateBuilder';
import { renderWithProviders, screen, waitFor } from 'tests/test-utils';

import B3Nav from '@/components/layout/B3Nav';
import { newPermissions } from '@/shared/routes/config';
import { CompanyStatus, CustomerRole, Environment, UserTypes } from '@/types';

const documentsEnabledContext = {
  storefrontConfig: {
    shoppingLists: false,
    tradeProfessionalApplication: false,
    invoice: {
      enabledStatus: true,
      value: true,
    },
  },
};

const companyWithInvoicePermission = buildCompanyStateWith({
  companyInfo: { status: CompanyStatus.APPROVED },
  customer: {
    role: CustomerRole.ADMIN,
    userType: UserTypes.MULTIPLE_B2C,
  },
  permissions: [{ code: newPermissions.invoicePermissionCodes, permissionLevel: 3 }],
});

describe('Documents navigation item', () => {
  it('is available in staging to a B2B user with invoice access', async () => {
    window.B3.setting.environment = Environment.Staging;

    renderWithProviders(<B3Nav />, {
      preloadedState: { company: companyWithInvoicePermission },
      initialGlobalContext: documentsEnabledContext,
    });

    expect(await screen.findByText('Documents')).toBeInTheDocument();
  });

  it('is available locally to allow development against staging', async () => {
    window.B3.setting.environment = Environment.Local;

    renderWithProviders(<B3Nav />, {
      preloadedState: { company: companyWithInvoicePermission },
      initialGlobalContext: documentsEnabledContext,
    });

    expect(await screen.findByText('Documents')).toBeInTheDocument();
  });

  it('is hidden in production', async () => {
    window.B3.setting.environment = Environment.Production;

    renderWithProviders(<B3Nav />, {
      preloadedState: { company: companyWithInvoicePermission },
      initialGlobalContext: documentsEnabledContext,
    });

    await waitFor(() => expect(screen.queryByText('Documents')).not.toBeInTheDocument());
  });

  it('is hidden when the user lacks invoice access', async () => {
    window.B3.setting.environment = Environment.Staging;
    const companyWithoutInvoicePermission = buildCompanyStateWith({
      ...companyWithInvoicePermission,
      permissions: [],
    });

    renderWithProviders(<B3Nav />, {
      preloadedState: { company: companyWithoutInvoicePermission },
      initialGlobalContext: documentsEnabledContext,
    });

    await waitFor(() => expect(screen.queryByText('Documents')).not.toBeInTheDocument());
  });

  it('is hidden when invoices are disabled', async () => {
    window.B3.setting.environment = Environment.Staging;

    renderWithProviders(<B3Nav />, {
      preloadedState: { company: companyWithInvoicePermission },
      initialGlobalContext: {
        storefrontConfig: {
          ...documentsEnabledContext.storefrontConfig,
          invoice: { enabledStatus: false, value: true },
        },
      },
    });

    await waitFor(() => expect(screen.queryByText('Documents')).not.toBeInTheDocument());
  });
});
