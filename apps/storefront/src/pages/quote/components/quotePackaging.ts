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
