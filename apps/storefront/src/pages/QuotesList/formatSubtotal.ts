import type { DisplayCurrency } from '@/types/currency';
import { formatBcCurrencyToDisplayCurrency, getActiveCurrencyInfo } from '@/utils/currencyUtils';

import {
  formatQuoteConvertedPrice,
  formatQuoteSummaryPrice,
} from '../quote/components/quotePriceFormat';

export function formatSubtotal(amount: number, currency?: CurrencyProps | DisplayCurrency) {
  const effectiveCurrency = currency ?? formatBcCurrencyToDisplayCurrency(getActiveCurrencyInfo());

  return formatQuoteSummaryPrice(
    formatQuoteConvertedPrice(Number(amount), {
      currency: { ...effectiveCurrency, decimalPlaces: 2 },
      isConversionRate: false,
      useCurrentCurrency: true,
    }),
  );
}
