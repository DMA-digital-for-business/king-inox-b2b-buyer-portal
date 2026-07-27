import b2bVerifyBcLoginStatus from './b2bVerifyBcLoginStatus';
import b2bLogger from './b3Logger';
import { logoutSession } from './logoutSession';

export const isB2bTokenPage = (gotoUrl?: string) => {
  const noB2bTokenPages = ['quotedraft', 'quotedetail', 'register', 'login', 'forgotpassword'];

  if (gotoUrl) {
    const normalizedGotoUrl = gotoUrl.toLowerCase();

    return !noB2bTokenPages.some((item: string) => normalizedGotoUrl.includes(item));
  }

  const { hash = '' } = window.location;

  if (!hash.includes('#/')) {
    return false;
  }

  const normalizedHash = hash.toLowerCase();

  return !noB2bTokenPages.some((item: string) => normalizedHash.includes(item));
};

export const isUserGotoLogin = async (gotoUrl: string) => {
  if (!isB2bTokenPage(gotoUrl)) {
    return false;
  }

  try {
    const isBcLogin = await b2bVerifyBcLoginStatus();

    if (!isBcLogin) {
      logoutSession();
      return true;
    }
  } catch (error: unknown) {
    b2bLogger.error(error);
  }

  return false;
};
