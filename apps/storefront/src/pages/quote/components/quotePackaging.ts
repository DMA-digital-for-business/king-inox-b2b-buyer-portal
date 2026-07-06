import type { QuoteItem } from '@/types/quotes';

export type PackagingMetafieldKey = 'SCATOLA' | 'MASTER_CARTON' | 'PALLET';

export const packagingColumns: Array<{ key: PackagingMetafieldKey; title: string }> = [
  { key: 'SCATOLA', title: 'Box' },
  { key: 'MASTER_CARTON', title: 'M. Carton' },
  { key: 'PALLET', title: 'Pallet' },
];

export function getPackagingMetafieldValue(
  row: QuoteItem['node'],
  metafieldKey: PackagingMetafieldKey,
  packagingByVariantId?: Record<number, Array<{ entityId: number; key: string; value: string }>>,
) {
  const packagingFromMap =
    packagingByVariantId?.[Number(row.variantId)]?.find((node) => node.key === metafieldKey)?.value;
  const variantFromProduct = row.productsSearch?.variants?.find(({ sku }) => sku === row.variantSku);
  const packagingMetafields = variantFromProduct?.packagingMetafields?.edges || [];

  return packagingFromMap || packagingMetafields.find(({ node }) => node.key === metafieldKey)?.node.value || '-';
}

export function getBoxQuantity(
  row: QuoteItem['node'],
  packagingByVariantId?: Record<number, Array<{ entityId: number; key: string; value: string }>>,
) {
  const boxQuantity = Number(getPackagingMetafieldValue(row, 'SCATOLA', packagingByVariantId));

  if (!Number.isFinite(boxQuantity) || boxQuantity <= 0) {
    return null;
  }

  return boxQuantity;
}

export function normalizeQuantityToBoxMultiple(
  row: QuoteItem['node'],
  quantity: number,
  packagingByVariantId?: Record<number, Array<{ entityId: number; key: string; value: string }>>,
) {
  const boxQuantity = getBoxQuantity(row, packagingByVariantId);
  console.log('boxQuantity', boxQuantity);
  if (!boxQuantity || quantity <= 0) {
    return quantity;
  }

  return Math.ceil(quantity / boxQuantity) * boxQuantity;
}

export function normalizeQuantityToBoxStep(
  row: QuoteItem['node'],
  quantity: number,
  currentQuantity: number,
  packagingByVariantId?: Record<number, Array<{ entityId: number; key: string; value: string }>>,
) {
  const boxQuantity = getBoxQuantity(row, packagingByVariantId);

  if (!boxQuantity || quantity <= 0) {
    return quantity;
  }

  if (quantity === currentQuantity) {
    return quantity;
  }

  if (quantity > currentQuantity) {
    return Math.ceil(quantity / boxQuantity) * boxQuantity;
  }

  return Math.max(boxQuantity, Math.floor(quantity / boxQuantity) * boxQuantity);
}
