import { useQuery } from '@tanstack/react-query';

import { storefrontGQLRequest } from '@/shared/service/bc/graphql/client';
import B3Request from '@/shared/service/request/b3Fetch';

import type { PdfExtraField, PdfVariantData } from './quotePdfData';

interface VariantTarget {
  productId?: number | string;
  variantId?: number | string;
}

interface MetafieldConnection {
  edges?: Array<{ node: { key: string; value: string } }>;
}

interface VariantNode {
  entityId: number;
  sku?: string;
  packaging?: MetafieldConnection;
  dimensions?: MetafieldConnection;
  stock?: MetafieldConnection;
}

interface PdfAddress {
  id: number | string;
  extraFields?: PdfExtraField[];
}

interface ResourceOptions {
  items: VariantTarget[];
  companyId?: number | string;
  userId?: number;
  customerId?: number;
  masquerading?: boolean;
  companyFields?: PdfExtraField[];
}

const metafieldValues = (connection?: MetafieldConnection) =>
  Object.fromEntries((connection?.edges || []).map(({ node }) => [node.key, node.value]));

export async function fetchQuotePdfVariants(
  items: VariantTarget[],
): Promise<Record<number, PdfVariantData>> {
  const targets = items
    .filter(
      ({ productId, variantId }) =>
        Number.isInteger(Number(productId)) &&
        Number(productId) > 0 &&
        Number.isInteger(Number(variantId)) &&
        Number(variantId) > 0,
    )
    .filter(
      (item, index, all) =>
        all.findIndex(
          (other) =>
            Number(other.productId) === Number(item.productId) &&
            Number(other.variantId) === Number(item.variantId),
        ) === index,
    );
  // Bound query complexity for quotes with many lines.
  const batches = Array.from({ length: Math.ceil(targets.length / 20) }, (_, index) =>
    targets.slice(index * 20, (index + 1) * 20),
  );
  const results = await Promise.all(
    batches.map(async (batch) => {
      const result: Record<number, PdfVariantData> = {};
      const selections = batch
        .map(
          ({ productId, variantId }, index) => `
      p${index}: product(entityId: ${Number(productId)}) {
        variants(entityIds: [${Number(variantId)}], first: 1) {
          edges { node { entityId sku
            packaging: metafields(namespace: "packaging", first: 10) { edges { node { key value } } }
            dimensions: metafields(namespace: "dimensions", first: 10) { edges { node { key value } } }
            stock: metafields(namespace: "stock", first: 10) { edges { node { key value } } }
          } }
        }
      }`,
        )
        .join('\n');
      const response = await storefrontGQLRequest<{
        data?: {
          site?: Record<string, { variants?: { edges?: Array<{ node: VariantNode }> } } | null>;
        };
        errors?: Array<{ message: string }>;
      }>({ query: `query GetQuotePdfVariants { site { ${selections} } }` });
      if (response.errors?.length) throw new Error(response.errors[0].message);
      Object.values(response.data?.site || {}).forEach((product) => {
        const variant = product?.variants?.edges?.[0]?.node;
        if (variant)
          result[variant.entityId] = {
            sku: variant.sku,
            packaging: metafieldValues(variant.packaging),
            dimensions: metafieldValues(variant.dimensions),
            stock: metafieldValues(variant.stock),
          };
      });
      return result;
    }),
  );
  return Object.assign({}, ...results);
}

async function fetchPdfAddresses(companyId: number, offset = 0): Promise<PdfAddress[]> {
  const response = await B3Request.graphqlB2B<{
    addresses: { edges: Array<{ node: PdfAddress }>; pageInfo: { hasNextPage: boolean } };
  }>({
    query: `query GetQuotePdfAddresses {
      addresses(companyId: ${companyId}, first: 50, offset: ${offset}) {
        edges { node { id extraFields { fieldName fieldValue } } }
        pageInfo { hasNextPage }
      }
    }`,
  });
  const addresses = (response.addresses?.edges || []).map(({ node }) => node);
  if (addresses.length && response.addresses?.pageInfo?.hasNextPage) {
    return addresses.concat(await fetchPdfAddresses(companyId, offset + addresses.length));
  }
  return addresses;
}

async function fetchPdfCompanyFields(
  options: ResourceOptions,
): Promise<PdfExtraField[] | undefined> {
  if (options.companyFields) return options.companyFields;
  let selection: string | undefined;
  if (options.masquerading && options.customerId)
    selection = `superAdminMasquerading(customerId: ${Number(options.customerId)})`;
  else if (options.userId) selection = `userCompany(userId: ${Number(options.userId)})`;
  if (!selection) return undefined;
  const response = await B3Request.graphqlB2B<{
    pdfCompany?: { id: string; extraFields?: PdfExtraField[] };
  }>({
    query: `query GetQuotePdfCompany { pdfCompany: ${selection} { id extraFields { fieldName fieldValue } } }`,
  });
  // Never use a different company's ERP code (e.g. when viewing a subsidiary).
  return Number(response.pdfCompany?.id) === Number(options.companyId)
    ? response.pdfCompany?.extraFields
    : undefined;
}

async function fetchCommercialData(options: ResourceOptions) {
  const companyId = Number(options.companyId);
  if (!Number.isInteger(companyId) || companyId <= 0)
    return { addresses: [] as PdfAddress[], companyFields: options.companyFields };
  const [addresses, companyFields] = await Promise.all([
    fetchPdfAddresses(companyId),
    fetchPdfCompanyFields(options),
  ]);
  return { addresses, companyFields };
}

export function useQuotePdfResources(options: ResourceOptions) {
  const query = useQuery({
    queryKey: ['quote-pdf-resources', options],
    queryFn: async () => {
      const [variants, commercial] = await Promise.all([
        fetchQuotePdfVariants(options.items),
        fetchCommercialData(options),
      ]);
      return { variants, ...commercial };
    },
    enabled: false,
    retry: false,
  });
  return async () => {
    const { data } = await query.refetch({ throwOnError: true });
    if (!data) throw new Error('Quote PDF resources unavailable');
    return data;
  };
}
