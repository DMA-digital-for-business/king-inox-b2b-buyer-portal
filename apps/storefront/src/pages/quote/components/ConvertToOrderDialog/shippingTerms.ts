import { getCurrentCustomerJWT } from '@/shared/service/bc/api/login';
import { getCurrentApiClientId, getCurrentApiDomain } from '@/shared/service/kingInox/apiDomain';
import B3Request from '@/shared/service/request/b3Fetch';
import type { ShippingAddress } from '@/types/quotes';

interface AddressFields {
  id: string | number;
  extraFields: NonNullable<ShippingAddress['extraFields']>;
}

// Accept the same localized threshold formats as the storefront cart.
function parseShippingThreshold(value: string): number | null {
  const raw = value.trim().replace(/[^\d,.-]/g, '');
  if (!raw) return null;
  let normalized = raw;
  if (raw.includes(',') && raw.includes('.')) {
    normalized =
      raw.lastIndexOf(',') > raw.lastIndexOf('.')
        ? raw.replace(/\./g, '').replace(',', '.')
        : raw.replace(/,/g, '');
  } else if (raw.includes(',')) normalized = raw.replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

async function loadAddressFields(
  companyId: number,
  addressId: number,
  offset = 0,
): Promise<AddressFields['extraFields']> {
  const { addresses } = await B3Request.graphqlB2B<{
    addresses: { edges: Array<{ node: AddressFields }>; pageInfo: { hasNextPage: boolean } };
  }>({
    query: `query QuoteConversionAddresses {
      addresses(companyId: ${companyId}, first: 50, offset: ${offset}) {
        edges { node { id extraFields { fieldName fieldValue } } }
        pageInfo { hasNextPage }
      }
    }`,
  });
  const match = addresses.edges.find(({ node }) => String(node.id) === String(addressId));
  if (match) return match.node.extraFields;
  if (addresses.pageInfo.hasNextPage && addresses.edges.length) {
    return loadAddressFields(companyId, addressId, offset + addresses.edges.length);
  }
  throw new Error('Quote shipping address unavailable');
}

export async function loadQuoteShippingTerms(companyId: number, address: ShippingAddress) {
  if (!address?.address?.trim()) throw new Error('Quote shipping address required');
  const fields =
    Number.isInteger(companyId) && companyId > 0 && address.addressId
      ? await loadAddressFields(companyId, address.addressId)
      : address.extraFields;
  if (!fields) throw new Error('Quote shipping address fields unavailable');
  const fieldValue = (name: string) =>
    fields.find(({ fieldName }) => fieldName.trim().toUpperCase() === name)?.fieldValue || '';
  const threshold = parseShippingThreshold(fieldValue('SOGLIA PORTOFRANCO'));
  const description = fieldValue('DESCRIZIONE PORTO');
  if (threshold === null) return { threshold, description, ordersTotal: 0 };

  const token = (await getCurrentCustomerJWT(getCurrentApiClientId()))?.trim();
  if (!token) throw new Error('Current customer JWT unavailable');
  const response = await fetch(`${getCurrentApiDomain()}/api/v1/bigcommerce/order-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Order totals unavailable (${response.status})`);
  const payload: { data?: Array<{ amount_shipped_next_7_days: number | string | null }> } =
    await response.json();
  if (!Array.isArray(payload.data)) throw new Error('Invalid order totals');
  let totalCents = 0;
  payload.data.forEach(({ amount_shipped_next_7_days: amount }) => {
    if (amount === null) return;
    if ((typeof amount !== 'number' && typeof amount !== 'string') || String(amount).trim() === '')
      throw new Error('Invalid order amount');
    totalCents += Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(totalCents)) throw new Error('Invalid order total');
  });
  return { threshold, description, ordersTotal: totalCents / 100 };
}
