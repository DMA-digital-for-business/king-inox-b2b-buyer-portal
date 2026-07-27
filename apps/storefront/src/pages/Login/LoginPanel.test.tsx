import { builder, faker, renderWithProviders, screen } from 'tests/test-utils';

import LoginPanel from './LoginPanel';

const buildLoginPanelPropsWith = builder(() => ({
  widgetBodyText: `<p>${faker.lorem.sentence()}</p>`,
  createAccountButtonText: faker.lorem.words(),
  joinCompanyPrompt: faker.lorem.sentence(),
  joinCompanyLinkText: faker.lorem.words(),
}));

describe('LoginPanel', () => {
  it('lets an existing company user open the join company page', async () => {
    const props = buildLoginPanelPropsWith({});
    const { navigation, user } = renderWithProviders(
      <LoginPanel
        widgetBodyText={props.widgetBodyText}
        createAccountButtonText={props.createAccountButtonText}
        joinCompanyPrompt={props.joinCompanyPrompt}
        joinCompanyLinkText={props.joinCompanyLinkText}
      />,
    );

    expect(screen.getByText(props.joinCompanyPrompt)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: props.joinCompanyLinkText }));

    expect(navigation).toHaveBeenLastCalledWith('/join-company');
  });
});
