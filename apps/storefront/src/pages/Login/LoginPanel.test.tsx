import { builder, faker, renderWithProviders, screen } from 'tests/test-utils';

import LoginPanel from './LoginPanel';

const buildLoginPanelPropsWith = builder(() => ({
  widgetBodyText: `<p>${faker.lorem.sentence()}</p>`,
  createAccountButtonText: faker.lorem.words(),
}));

describe('LoginPanel', () => {
  it('lets a user open the registration page', async () => {
    const props = buildLoginPanelPropsWith({});
    const { navigation, user } = renderWithProviders(
      <LoginPanel
        widgetBodyText={props.widgetBodyText}
        createAccountButtonText={props.createAccountButtonText}
      />,
    );

    await user.click(screen.getByRole('link', { name: props.createAccountButtonText }));

    expect(navigation).toHaveBeenLastCalledWith('/register');
  });
});
