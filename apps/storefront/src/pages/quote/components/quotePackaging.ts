export type PackagingMetafieldKey = 'SCATOLA' | 'MASTER_CARTON' | 'PALLET';

interface PackagingRow {
  variantId?: number | string;
  variantSku?: string;
  productsSearch?: {
    variants?: Array<{
      sku?: string;
      packagingMetafields?: {
        edges?: Array<{ node: { key: string; value: string } }>;
      };
    }>;
  };
}

export const packagingColumns: Array<{ key: PackagingMetafieldKey; title: string }> = [
  { key: 'SCATOLA', title: 'Box' },
  { key: 'MASTER_CARTON', title: 'M. Carton' },
  { key: 'PALLET', title: 'Pallet' },
];

export function getPackagingMetafieldValue(
  row: PackagingRow,
  metafieldKey: PackagingMetafieldKey,
  packagingByVariantId?: Record<number, Array<{ entityId: number; key: string; value: string }>>,
) {
  const packagingFromMap = packagingByVariantId?.[Number(row.variantId)]?.find(
    (node) => node.key === metafieldKey,
  )?.value;
  const variantFromProduct = row.productsSearch?.variants?.find(
    ({ sku }) => sku === row.variantSku,
  );
  const packagingMetafields = variantFromProduct?.packagingMetafields?.edges || [];

  return (
    packagingFromMap ||
    packagingMetafields.find(({ node }) => node.key === metafieldKey)?.node.value ||
    '-'
  );
}

export function getBoxQuantity(
  row: PackagingRow,
  packagingByVariantId?: Record<number, Array<{ entityId: number; key: string; value: string }>>,
) {
  const boxQuantity = Number(getPackagingMetafieldValue(row, 'SCATOLA', packagingByVariantId));

  if (!Number.isFinite(boxQuantity) || boxQuantity <= 0) {
    return null;
  }

  return boxQuantity;
}

export function normalizeQuantityToBoxMultiple(
  row: PackagingRow,
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
  row: PackagingRow,
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
