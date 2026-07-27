import { useContext } from 'react';

import { useB3Lang } from '@/lib/lang';
import { CustomStyleContext } from '@/shared/customStyleButton';
import { defaultCreateAccountPanel } from '@/shared/customStyleButton/context/config';
import { GlobalContext } from '@/shared/global';

export const useLoginInfo = () => {
  const {
    state: { logo },
  } = useContext(GlobalContext);
  const {
    state: { loginPageButton, loginPageDisplay, loginPageHtml },
  } = useContext(CustomStyleContext);
  const b3Lang = useB3Lang();

  const { primaryButtonColor } = loginPageButton;
  const { displayStoreLogo } = loginPageDisplay;

  const { bottomHtmlRegionEnabled, bottomHtmlRegionHtml, topHtmlRegionEnabled, topHtmlRegionHtml } =
    loginPageHtml;

  const loginInfo = {
    loginBtn: b3Lang('login.button.signInUppercase'),
    createAccountButtonText: b3Lang('login.button.createAccount'),
    joinCompanyPrompt: b3Lang('login.joinCompany.prompt'),
    joinCompanyLinkText: b3Lang('login.joinCompany.link'),
    btnColor: primaryButtonColor || '',
    widgetHeadText: topHtmlRegionEnabled ? topHtmlRegionHtml : undefined,
    widgetBodyText: defaultCreateAccountPanel(b3Lang),
    widgetFooterText: bottomHtmlRegionEnabled ? bottomHtmlRegionHtml : undefined,
    logo: displayStoreLogo ? logo : undefined,
  };
  return loginInfo;
};
