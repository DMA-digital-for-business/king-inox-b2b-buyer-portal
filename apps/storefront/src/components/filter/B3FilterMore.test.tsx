import { createPortal } from 'react-dom';
import { renderWithProviders, userEvent, waitFor, within } from 'tests/test-utils';

import B3FilterMore from './B3FilterMore';

describe('Mobile filters', () => {
  it.each([
    { action: 'close', label: 'Close' },
    { action: 'cancel', label: 'Cancel' },
    { action: 'escape', label: undefined },
    { action: 'apply', label: 'Apply' },
  ])(
    'dismisses the filters with $action inside the buyer portal iframe',
    async ({ action, label }) => {
      vi.spyOn(document.body, 'clientWidth', 'get').mockReturnValue(375);
      const frame = document.createElement('iframe');
      document.body.appendChild(frame);
      const frameDocument = frame.contentDocument;
      if (!frameDocument) throw new Error('Portal iframe document unavailable');
      const portalScreen = within(frameDocument.body);
      const user = userEvent.setup({ document: frameDocument });
      const onChange = vi.fn();
      const { result } = renderWithProviders(
        createPortal(
          <B3FilterMore filterMoreInfo={[]} isShowMore onChange={onChange} />,
          frameDocument.body,
        ),
      );

      try {
        const openButton = portalScreen.getByRole('button', { name: 'edit' });
        await user.click(openButton);
        const dialog = await portalScreen.findByRole('dialog', { name: 'Filters' });

        if (label) {
          await user.click(within(dialog).getByRole('button', { name: label }));
        } else {
          await user.keyboard('{Escape}');
        }

        await waitFor(() => expect(portalScreen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(openButton).toHaveFocus();
        if (action === 'apply') {
          expect(onChange).toHaveBeenCalledExactlyOnceWith({});
        } else {
          expect(onChange).not.toHaveBeenCalled();
        }
      } finally {
        result.unmount();
        frame.remove();
      }
    },
  );
});
