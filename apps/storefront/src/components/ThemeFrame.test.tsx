import { renderWithProviders, screen, waitFor } from 'tests/test-utils';

import { ThemeFrame } from '@/components/ThemeFrame';

describe('ThemeFrame event forwarding', () => {
  it('forwards iframe clicks to parent listeners with an element target', async () => {
    renderWithProviders(<ThemeFrame title="Buyer portal">{null}</ThemeFrame>);
    const iframe = screen.getByTitle<HTMLIFrameElement>('Buyer portal');
    const onClick = vi.fn();
    document.addEventListener('click', onClick);

    try {
      await waitFor(() => {
        iframe.contentDocument?.dispatchEvent(new Event('click'));
        expect(onClick).toHaveBeenCalled();
      });

      const event = onClick.mock.calls[0][0];
      expect(event.target).toBe(iframe);
      expect(event.target.closest('iframe')).toBe(iframe);
    } finally {
      document.removeEventListener('click', onClick);
    }
  });
});
