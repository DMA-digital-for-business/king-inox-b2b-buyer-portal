export const DOCUMENT_TYPE_FILTERS = {
  all: [],
  offers: [22, 164],
  orders: [23, 27],
  ddt: [2, 1002],
  invoices: [3, 191, 796, 9000],
} as const;

export type DocumentTypeFilter = keyof typeof DOCUMENT_TYPE_FILTERS;

export type DocumentTypeCategory = Exclude<DocumentTypeFilter, 'all'>;

export type DocumentSortBy = 'filename' | 'datareg';

export type DocumentSortDirection = 'asc' | 'desc';

export function getDocumentTypeCategory(documentType: number): DocumentTypeCategory | undefined {
  return (Object.keys(DOCUMENT_TYPE_FILTERS) as DocumentTypeFilter[]).find(
    (filter): filter is DocumentTypeCategory =>
      filter !== 'all' && DOCUMENT_TYPE_FILTERS[filter].some((type) => type === documentType),
  );
}

export interface DocumentItem {
  documentId: number;
  fileName: string;
  documentType: number;
  documentTypeLabel: string;
  registrationDate: string;
}

interface DocumentsPaging {
  total: number;
  offset: number;
  limit: number;
  next?: number;
}

export interface DocumentsResponse {
  data: DocumentItem[];
  paging: DocumentsPaging;
}

export interface DocumentsRequestParams {
  offset: number;
  limit: number;
  documentTypes: readonly number[];
  sortBy: DocumentSortBy;
  sortDir: DocumentSortDirection;
}

export interface DocumentDownload {
  blob: Blob;
  fileName?: string;
}
