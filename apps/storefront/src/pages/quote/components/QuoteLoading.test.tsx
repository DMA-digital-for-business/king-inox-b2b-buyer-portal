import { builder, faker, renderWithProviders, screen } from 'tests/test-utils';

import QuoteLoading from './QuoteLoading';

const buildFormWith = builder(() => ({
  label: faker.lorem.words(),
  value: faker.lorem.sentence(),
}));

it('shows the quote skeleton while loading and reveals the loaded content', () => {
  const { label, value } = buildFormWith('WHATEVER_VALUES');
  const { result } = renderWithProviders(
    <QuoteLoading busy>
      <p>{value}</p>
    </QuoteLoading>,
  );

  expect(screen.getByRole('status', { name: 'Loading...' })).toBeVisible();
  expect(screen.getByRole('img', { name: 'King inox' })).toBeVisible();
  expect(screen.getByText('Loading...')).toBeVisible();
  expect(screen.getByText(value)).not.toBeVisible();
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  result.rerender(
    <QuoteLoading busy={false} loadingLabel={label}>
      <p>{value}</p>
    </QuoteLoading>,
  );

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(screen.getByText(value)).toBeVisible();
});

it('preserves entered values while an action shows the skeleton', async () => {
  const { label, value } = buildFormWith('WHATEVER_VALUES');
  const { user, result } = renderWithProviders(
    <QuoteLoading busy={false}>
      <input aria-label={label} />
    </QuoteLoading>,
  );
  await user.type(screen.getByRole('textbox', { name: label }), value);

  result.rerender(
    <QuoteLoading busy>
      <input aria-label={label} />
    </QuoteLoading>,
  );
  expect(screen.getByRole('status')).toBeVisible();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

  result.rerender(
    <QuoteLoading busy={false}>
      <input aria-label={label} />
    </QuoteLoading>,
  );
  expect(screen.getByRole('textbox', { name: label })).toBeVisible();
  expect(screen.getByRole('textbox', { name: label })).toHaveValue(value);
});
