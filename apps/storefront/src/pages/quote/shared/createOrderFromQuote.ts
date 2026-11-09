import { getCurrentCustomerJWT } from '@/shared/service/bc/api/login';
import { getCurrentApiClientId, getCurrentApiDomain } from '@/shared/service/kingInox/apiDomain';

export default async function createOrderFromQuote(
  quoteId: string,
  createdAt: number,
): Promise<void> {
  const token = (await getCurrentCustomerJWT(getCurrentApiClientId()))?.trim();
  if (!token) {
    throw new Error('A current customer JWT could not be obtained.');
  }

  const response = await fetch(`${getCurrentApiDomain()}/api/v1/bigcommerce/quote-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ quote_id: Number(quoteId), createdAt }),
  });

  if (!response.ok) {
    throw new Error(`Unable to create order from quote (${response.status})`);
  }
}
