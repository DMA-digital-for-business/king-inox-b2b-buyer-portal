import { getCurrentCustomerJWT } from '@/shared/service/bc/api/login';
import { getCurrentApiClientId, getCurrentApiDomain } from '@/shared/service/kingInox/apiDomain';
import b2bLogger from '@/utils/b3Logger';

export async function setLastLogin(): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const token = (await getCurrentCustomerJWT(getCurrentApiClientId(), controller.signal))?.trim();
    if (!token) {
      throw new Error('A current customer JWT could not be obtained.');
    }

    const response = await fetch(`${getCurrentApiDomain()}/api/v1/bigcommerce/set-last-login`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Unable to set last login (${response.status})`);
    }
  } catch (error) {
    b2bLogger.error('Failed to set last login:', error);
  } finally {
    clearTimeout(timeout);
  }
}
