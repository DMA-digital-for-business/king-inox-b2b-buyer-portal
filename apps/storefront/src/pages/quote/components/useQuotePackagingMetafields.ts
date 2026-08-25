import { useEffect, useMemo, useState } from 'react';

import { storefrontGQLRequest } from '@/shared/service/bc/graphql/client';
import { QuoteItem } from '@/types/quotes';

interface PackagingMetafieldNode {
  entityId: number;
  key: string;
  value: string;
}

interface VariantPackagingNode {
  entityId: number;
  sku?: string | null;
  metafields?: {
    edges?: Array<{
      node?: PackagingMetafieldNode | null;
    } | null>;
  } | null;
}

export type PackagingByVariantId = Record<number, PackagingMetafieldNode[]>;

function buildQuotePackagingQuery(items: Array<{ productId: number; variantId: number }>) {
  const selections = items.map(
    ({ productId, variantId }, index) => `
      product_${index}: product(entityId: ${productId}) {
        variant_${index}: variants(entityIds: [${variantId}], first: 1) {
          edges {
            node {
              entityId
              sku
              metafields(namespace: "packaging", first: 10) {
                edges {
                  node {
                    entityId
                    key
                    value
                  }
                }
              }
            }
          }
        }
      }
    `,
  );

  return `
    query GetQuotePackagingMetafields {
      site {
        ${selections.join('\n')}
      }
    }
  `;
}

function buildPackagingMap(site: Record<string, unknown>): PackagingByVariantId {
  const packagingByVariantId: PackagingByVariantId = {};

  Object.values(site).forEach((productEntry) => {
    const variantConnection = (productEntry as { [key: string]: unknown } | null)?.[
      Object.keys((productEntry as { [key: string]: unknown } | null) || {}).find((key) =>
        key.startsWith('variant_'),
      ) || ''
    ] as { edges?: Array<{ node?: VariantPackagingNode | null } | null> } | undefined;

    const variantNode = variantConnection?.edges?.[0]?.node;
    const variantId = variantNode?.entityId;

    if (!variantId) return;

    packagingByVariantId[variantId] =
      variantNode?.metafields?.edges
        ?.map((edge) => edge?.node)
        .filter((node): node is PackagingMetafieldNode => Boolean(node)) || [];
  });

  return packagingByVariantId;
}

export function useQuotePackagingMetafields(items: QuoteItem[]): PackagingByVariantId {
  const [packagingByVariantId, setPackagingByVariantId] = useState<PackagingByVariantId>({});

  const packagingTargets = useMemo(
    () =>
      items
        .map(({ node }) => ({
          productId: Number(node.productId),
          variantId: Number(node.variantId),
        }))
        .filter(
          ({ productId, variantId }) =>
            Number.isInteger(productId) &&
            productId > 0 &&
            Number.isInteger(variantId) &&
            variantId > 0,
        )
        .filter(
          (item, index, allItems) =>
            allItems.findIndex(
              ({ productId, variantId }) =>
                productId === item.productId && variantId === item.variantId,
            ) === index,
        ),
    [items],
  );

  useEffect(() => {
    if (packagingTargets.length === 0) {
      setPackagingByVariantId({});
      return;
    }

    let cancelled = false;

    const fetchPackaging = async () => {
      try {
        const response = await storefrontGQLRequest<{
          data?: {
            site?: Record<string, unknown>;
          };
        }>({
          query: buildQuotePackagingQuery(packagingTargets),
        });

        if (!cancelled) {
          setPackagingByVariantId(buildPackagingMap(response.data?.site || {}));
        }
      } catch {
        if (!cancelled) {
          setPackagingByVariantId({});
        }
      }
    };

    fetchPackaging();

    return () => {
      cancelled = true;
    };
  }, [packagingTargets]);

  return packagingByVariantId;
}
