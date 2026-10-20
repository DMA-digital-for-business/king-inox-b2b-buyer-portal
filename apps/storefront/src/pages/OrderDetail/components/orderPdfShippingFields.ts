import type { PdfAddress } from '@/pages/quote/components/useQuotePdfResources';
import type { Address } from '@/types';

const normalize = (value?: string) => value?.trim().replace(/\s+/g, ' ').toLocaleLowerCase() || '';

export function orderPdfShippingFields(addresses: PdfAddress[], shipping?: Address) {
  if (!shipping?.street_1?.trim()) return undefined;
  // Order address IDs identify order snapshots, not company address-book entries.
  const matches = addresses.filter(
    (address) =>
      normalize(address.addressLine1) === normalize(shipping.street_1) &&
      normalize(address.addressLine2) === normalize(shipping.street_2) &&
      normalize(address.city) === normalize(shipping.city) &&
      normalize(address.zipCode) === normalize(shipping.zip) &&
      (address.countryCode && shipping.country_iso2
        ? normalize(address.countryCode) === normalize(shipping.country_iso2)
        : normalize(address.country) === normalize(shipping.country)),
  );
  return matches.length === 1 ? matches[0].extraFields : undefined;
}
