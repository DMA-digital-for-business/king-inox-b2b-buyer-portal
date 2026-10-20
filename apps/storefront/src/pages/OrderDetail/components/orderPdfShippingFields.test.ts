import { builder, faker } from 'tests/test-utils';

import type { PdfAddress } from '@/pages/quote/components/useQuotePdfResources';
import type { Address } from '@/types';

import { orderPdfShippingFields } from './orderPdfShippingFields';

const buildShippingWith = builder<Address>(() => ({
  street_1: faker.location.streetAddress(),
  street_2: faker.location.secondaryAddress(),
  city: faker.location.city(),
  zip: faker.location.zipCode(),
  country: faker.location.country(),
  country_iso2: faker.location.countryCode(),
  company: faker.company.name(),
  email: faker.internet.email(),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  phone: faker.phone.number(),
  state: faker.location.state(),
}));
const buildAddressWith = builder<PdfAddress>(() => ({
  id: faker.string.numeric(),
  extraFields: [
    { fieldName: 'SPEDIZIONE', fieldValue: faker.lorem.word() },
    { fieldName: 'METODO PAGAMENTO', fieldValue: faker.lorem.word() },
    { fieldName: 'METODO PAGAMENTO IMBALLO', fieldValue: faker.lorem.word() },
  ],
}));

const addressFor = (shipping: Address) =>
  buildAddressWith({
    addressLine1: shipping.street_1,
    addressLine2: shipping.street_2,
    city: shipping.city,
    zipCode: shipping.zip,
    countryCode: shipping.country_iso2,
  });

describe('order PDF shipping terms', () => {
  it('reads commercial terms from the matching company shipping address', () => {
    const shipping = buildShippingWith('WHATEVER_VALUES');
    const address = addressFor(shipping);
    expect(
      orderPdfShippingFields([buildAddressWith('WHATEVER_VALUES'), address], {
        ...shipping,
        street_1: ` ${shipping.street_1.toUpperCase()} `,
      }),
    ).toEqual(address.extraFields);
  });

  it('does not use terms from a different address', () => {
    expect(
      orderPdfShippingFields(
        [addressFor(buildShippingWith('WHATEVER_VALUES'))],
        buildShippingWith('WHATEVER_VALUES'),
      ),
    ).toBeUndefined();
  });

  it('does not choose arbitrary terms when matching addresses are duplicated', () => {
    const shipping = buildShippingWith('WHATEVER_VALUES');
    expect(
      orderPdfShippingFields([addressFor(shipping), addressFor(shipping)], shipping),
    ).toBeUndefined();
  });

  it('handles orders without a shipping address', () => {
    expect(orderPdfShippingFields([buildAddressWith('WHATEVER_VALUES')])).toBeUndefined();
  });
});
