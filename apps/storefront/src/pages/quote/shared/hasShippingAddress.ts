import type { ShippingAddress } from '@/types/quotes';

export const hasShippingAddress = (address: Partial<ShippingAddress> | undefined): boolean =>
  typeof address?.address === 'string' && address.address.trim().length > 0;
