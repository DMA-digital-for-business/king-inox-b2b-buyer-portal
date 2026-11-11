import { createPortal } from 'react-dom';
import {
  buildCompanyStateWith,
  faker,
  renderWithProviders,
  screen,
  userEvent,
  waitFor,
  within,
} from 'tests/test-utils';

import { CustomerRole } from '@/types';

import B3MobileLayout from './B3MobileLayout';

function renderLayout(portalDocument?: Document) {
  const title = faker.lorem.words();
  const content = faker.lorem.sentence();
  const company = buildCompanyStateWith({ customer: { role: CustomerRole.B2C } });

  const layout = (
    <B3MobileLayout title={title}>
      <p>{content}</p>
    </B3MobileLayout>
  );

  return renderWithProviders(portalDocument ? createPortal(layout, portalDocument.body) : layout, {
    preloadedState: { company },
    initialGlobalContext: {
      storefrontConfig: {
        quickOrderPad: true,
        buyAgain: false,
        shoppingLists: false,
        tradeProfessionalApplication: false,
      },
    },
  });
}

describe('Compact sidebar', () => {
  it('opens the menu inside the buyer portal iframe and restores focus after closing', async () => {
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const frameDocument = frame.contentDocument;
    if (!frameDocument) throw new Error('Portal iframe document unavailable');
    const portalScreen = within(frameDocument.body);
    const user = userEvent.setup({ document: frameDocument });
    const { result } = renderLayout(frameDocument);

    try {
      const openButton = portalScreen.getByRole('button', { name: 'Open menu' });
      await user.click(openButton);

      const nav = await portalScreen.findByRole('navigation');
      expect(nav).toBeVisible();
      expect(nav.ownerDocument).toBe(frameDocument);
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
      expect(openButton).toHaveAttribute('aria-expanded', 'true');

      await user.keyboard('{Escape}');
      await waitFor(() => expect(portalScreen.queryByRole('navigation')).not.toBeInTheDocument());
      expect(openButton).toHaveFocus();
      expect(openButton).toHaveAttribute('aria-expanded', 'false');
    } finally {
      result.unmount();
      frame.remove();
    }
  });

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
