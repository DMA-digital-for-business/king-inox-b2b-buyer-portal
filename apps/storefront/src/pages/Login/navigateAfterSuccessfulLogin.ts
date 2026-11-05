import { type NavigateFunction } from 'react-router-dom';

export function navigateAfterSuccessfulLogin(
  navigate: NavigateFunction,
  quoteDetailToCheckoutUrl: string,
  redirectUrl: string,
): void {
  if (quoteDetailToCheckoutUrl) {
    navigate(quoteDetailToCheckoutUrl);
    return;
  }

  window.location.assign(redirectUrl);
}
