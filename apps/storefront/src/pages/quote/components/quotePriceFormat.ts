import { DisplayCurrency } from '@/types/currency';
import {
  currencyFormatConvert,
  currencyFormatInfo,
  ordersCurrencyFormat,
} from '@/utils/b3CurrencyFormat';

interface QuoteCurrencyOptions {
  currency?: CurrencyProps | DisplayCurrency;
  showCurrencyToken?: boolean;
  isConversionRate?: boolean;
  useCurrentCurrency?: boolean;
}

const clampDecimalPlaces = (decimalPlaces?: number) =>
  decimalPlaces === 0 ? 0 : Math.min(decimalPlaces || 2, 2);

export const formatQuotePrice = (price: number | string, showCurrencyToken = true) => {
  const moneyFormat = currencyFormatInfo();

  return ordersCurrencyFormat(
    {
      ...moneyFormat,
      decimal_places: clampDecimalPlaces(moneyFormat.decimal_places),
    },
    price,
    showCurrencyToken,
  );
};

export const formatQuoteConvertedPrice = (
  price: number | string,
  {
    currency,
    showCurrencyToken = true,
    isConversionRate = false,
    useCurrentCurrency = false,
  }: QuoteCurrencyOptions,
) =>
  currencyFormatConvert(price, {
    currency: currency
      ? {
          ...currency,
          decimalPlaces: clampDecimalPlaces(currency.decimalPlaces),
        }
      : currency,
    showCurrencyToken,
    isConversionRate,
    useCurrentCurrency,
  });
