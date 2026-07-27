import { Dispatch } from 'react';

import { LangFormatFunction } from '@/lib/lang';

type BtnKeys =
  | 'masqueradeButton'
  | 'switchAccountButton'
  | 'floatingAction'
  | 'addToAllQuoteBtn'
  | 'shoppingListBtn'
  | 'portalStyle'
  | 'loginPageButton'
  | 'loginPageDisplay'
  | 'loginPageHtml'
  | 'accountLoginRegistration'
  | 'companyAutoApproval'
  | 'cssOverride'
  | 'quoteOnNonPurchasableProductPageBtn';

interface BtnStyle {
  color: string;
  text: string;
  buttonText: string;
  location: string;
  customCss: string;
  horizontalPadding: string;
  verticalPadding: string;
  classSelector: string;
  locationSelector: string;
  backgroundColor: string;
  primaryColor: string;
  enabled: boolean;
  b2b: boolean;
  b2c: boolean;
  createAccountButtonText?: string;
  primaryButtonColor?: string;
  signInButtonText?: string;
  displayStoreLogo?: boolean;
  pageTitle?: string;
  bottomHtmlRegionEnabled?: boolean;
  bottomHtmlRegionHtml?: string;
  createAccountPanelHtml?: string;
  topHtmlRegionEnabled?: boolean;
  topHtmlRegionHtml?: string;
  css?: string;
}

export interface BtnProperties {
  classSelector: string;
  color: string;
  customCss: string;
  enabled: boolean;
  locationSelector: string;
  text: string;
}

export interface CustomStyleButtonState extends Record<BtnKeys, Partial<BtnStyle>> {
  addQuoteBtn: BtnProperties;
  shoppingListBtn: BtnProperties;
  addToAllQuoteBtn: BtnProperties;
  quoteOnNonPurchasableProductPageBtn: BtnProperties;
  globalButtonBackgroundColor: string;
}

export const defaultCreateAccountPanel = (b3Lang: LangFormatFunction) => `<div class="panel">
<div class="panel-header">
    <h2 class="panel-title">${b3Lang('login.createAccountPanel.title')}</h2>
</div>
<div class="panel-body">
    <p class="new-customer-intro">${b3Lang('login.createAccountPanel.intro')}</p>
    <ul class="new-customer-fact-list">
        <li class="new-customer-fact">${b3Lang('login.createAccountPanel.fact.checkoutFaster')}</li>
        <li class="new-customer-fact">${b3Lang('login.createAccountPanel.fact.saveShippingAddresses')}</li>
        <li class="new-customer-fact">${b3Lang('login.createAccountPanel.fact.orderHistory')}</li>
    </ul>
</div>
</div>
`;

export const initState = {
  globalButtonBackgroundColor: '#052940',
  portalStyle: {
    primaryColor: '#052940',
    backgroundColor: '#FFFFFF',
  },
  masqueradeButton: {
    color: '#FFFFFF',
    text: 'END MASQUERADE',
    location: 'bottomLeft',
    customCss: '',
    horizontalPadding: '',
    verticalPadding: '',
  },
  switchAccountButton: {
    color: '#FFFFFF',
    text: 'Switch Company',
    location: 'bottomLeft',
    customCss: '',
    horizontalPadding: '',
    verticalPadding: '',
  },
  addQuoteBtn: {
    color: '#fff',
    text: 'Add to Quote',
    customCss: '',
    classSelector: '',
    locationSelector: '',
    enabled: true,
  },
  quoteOnNonPurchasableProductPageBtn: {
    color: '#fff',
    text: 'Add to 1 Quote',
    customCss: '',
    classSelector: '',
    locationSelector: '',
    enabled: true,
  },
  floatingAction: {
    color: '#3385d6',
    text: 'Finish quote',
    buttonText: 'Finish quote',
    location: 'bottomRight',
    customCss: '',
    horizontalPadding: '',
    verticalPadding: '',
    enabled: false,
  },
  addToAllQuoteBtn: {
    color: '#fff',
    text: 'Add All to Quote',
    customCss: '',
    classSelector: '',
    locationSelector: '',
    enabled: true,
  },
  shoppingListBtn: {
    color: '#74685c',
    text: 'Add to Shopping List',
    customCss: '',
    classSelector: '',
    locationSelector: '',
    enabled: true,
  },
  loginPageButton: {
    createAccountButtonText: 'CREATE ACCOUNT',
    enabled: true,
    primaryButtonColor: '#052940',
    signInButtonText: 'SIGN IN',
  },
  loginPageDisplay: {
    displayStoreLogo: true,
    enabled: true,
    pageTitle: 'Sign In',
  },
  loginPageHtml: {
    bottomHtmlRegionEnabled: false,
    bottomHtmlRegionHtml: '',
    createAccountPanelHtml: '',
    enabled: true,
    topHtmlRegionEnabled: false,
    topHtmlRegionHtml: '',
  },
  accountLoginRegistration: {
    b2b: true,
    b2c: true,
  },
  companyAutoApproval: {
    enabled: true,
  },
  cssOverride: {
    css: '',
  },
};

export interface CustomStyleButtonAction {
  type: string;
  payload: Partial<CustomStyleButtonState>;
}

type DispatchProps = Dispatch<Partial<CustomStyleButtonAction>>;

export interface CustomStyleButtonContext {
  state: CustomStyleButtonState;
  dispatch: DispatchProps;
}
