import { builder, faker } from 'tests/test-utils';

import * as currencyFormat from '@/utils/b3CurrencyFormat';

import { formatQuoteConvertedPrice, formatQuotePrice } from './quotePriceFormat';

const buildCurrencyWith = builder(() => ({
  token: '€',
  location: 'left',
  currencyCode: 'EUR',
  decimalToken: ',',
  decimalPlaces: 2,
  thousandsToken: '.',
  currencyExchangeRate: '1.0000000000',
}));
const buildAmountWith = builder(() => ({
  amount: faker.number.float({ min: 0, max: 1000, fractionDigits: 3 }),
  expected: faker.commerce.price(),
}));

it.each([
  { amount: 10.075, expected: '€10,08' },
  { amount: 10.074, expected: '€10,07' },
  { amount: 1.005, expected: '€1,01' },
  { amount: 1.015, expected: '€1,02' },
  { amount: 2.675, expected: '€2,68' },
  { amount: -10.075, expected: '€-10,08' },
])('formats $amount consistently in draft, detail and quote list', (values) => {
  const { amount, expected } = buildAmountWith(values);
  const currency = buildCurrencyWith('WHATEVER_VALUES');
  vi.spyOn(currencyFormat, 'currencyFormatInfo').mockReturnValue({
    currency_location: 'left',
    currency_token: currency.token,
    decimal_token: currency.decimalToken,
    decimal_places: currency.decimalPlaces,
    thousands_token: currency.thousandsToken,
    currency_exchange_rate: currency.currencyExchangeRate,
  });

  expect(formatQuotePrice(amount)).toBe(expected);
  expect(
    formatQuoteConvertedPrice(amount, {
      currency,
      isConversionRate: false,
      useCurrentCurrency: true,
    }),
  ).toBe(expected);
});
