import {
  buildCompanyStateWith,
  faker,
  renderWithProviders,
  screen,
  waitFor,
  within,
} from 'tests/test-utils';

import { CustomerRole } from '@/types';

import B3MobileLayout from './B3MobileLayout';

function renderLayout() {
  const title = faker.lorem.words();
  const content = faker.lorem.sentence();
  const company = buildCompanyStateWith({ customer: { role: CustomerRole.B2C } });

  return renderWithProviders(
    <B3MobileLayout title={title}>
      <p>{content}</p>
    </B3MobileLayout>,
    {
      preloadedState: { company },
      initialGlobalContext: {
        storefrontConfig: {
          quickOrderPad: true,
          buyAgain: false,
          shoppingLists: false,
          tradeProfessionalApplication: false,
        },
      },
    },
  );
}

describe('Compact sidebar', () => {
  it('opens with the menu button and closes with Escape, restoring focus', async () => {
    const { user } = renderLayout();
    const openButton = screen.getByRole('button', { name: 'Open menu' });

    expect(openButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(openButton);
    expect(await screen.findByRole('navigation')).toBeVisible();
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('navigation')).not.toBeInTheDocument());
    expect(openButton).toHaveFocus();
    expect(openButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes with the close button', async () => {
    const { user } = renderLayout();
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(await screen.findByRole('button', { name: 'Close menu' }));

    await waitFor(() => expect(screen.queryByRole('navigation')).not.toBeInTheDocument());
  });

  it('closes after choosing a page at tablet widths too', async () => {
    vi.spyOn(document.body, 'clientWidth', 'get').mockReturnValue(900);
    const { user, navigation } = renderLayout();
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const nav = await screen.findByRole('navigation');
    await user.click(within(nav).getByText('Quick order'));

    await waitFor(() => expect(navigation).toHaveBeenLastCalledWith('/purchased-products'));
    await waitFor(() => expect(screen.queryByRole('navigation')).not.toBeInTheDocument());
  });
});
