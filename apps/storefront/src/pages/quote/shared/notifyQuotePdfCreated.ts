import { getCurrentCustomerJWT } from '@/shared/service/bc/api/login';
import { getCurrentApiClientId, getCurrentApiDomain } from '@/shared/service/kingInox/apiDomain';

export default async function notifyQuotePdfCreated(quoteId: string): Promise<void> {
  const token = (await getCurrentCustomerJWT(getCurrentApiClientId()))?.trim();
  if (!token) {
    throw new Error('A current customer JWT could not be obtained.');
  }

  const response = await fetch(`${getCurrentApiDomain()}/api/v1/bigcommerce/quote-pdf-created`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ quote_id: Number(quoteId) }),
  });

  if (!response.ok) {
    throw new Error(`Unable to notify quote PDF creation (${response.status})`);
  }
}
