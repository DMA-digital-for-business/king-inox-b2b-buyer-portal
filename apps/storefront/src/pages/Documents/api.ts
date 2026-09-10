import { getCurrentCustomerJWT } from '@/shared/service/bc/api/login';
import { getEnvironment } from '@/shared/service/request/base';
import { Environment } from '@/types';

import { DocumentDownload, DocumentsRequestParams, DocumentsResponse } from './types';

const STAGING_DOCUMENTS_API_URL =
  import.meta.env.VITE_DOCUMENTS_API_URL ??
  'https://rtpc12l9k0.execute-api.eu-central-1.amazonaws.com/sandbox';
const STAGING_DOCUMENTS_APP_CLIENT_ID =
  import.meta.env.VITE_DOCUMENTS_APP_CLIENT_ID ?? 'ooty5p0sanjii578e42z4mqbjj527av';

interface DocumentsServiceConfig {
  apiUrl: string;
  appClientId: string;
}

export class DocumentsApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'DocumentsApiError';
  }
}

function getDocumentsServiceConfig(): DocumentsServiceConfig {
  const environment = getEnvironment();

  if (environment === Environment.Local || environment === Environment.Staging) {
    return {
      apiUrl: STAGING_DOCUMENTS_API_URL,
      appClientId: STAGING_DOCUMENTS_APP_CLIENT_ID,
    };
  }

  // TODO: configure VITE_DOCUMENTS_API_URL and VITE_DOCUMENTS_APP_CLIENT_ID for production.
  throw new DocumentsApiError('The documents service is not configured for this environment.');
}

async function getDocumentsJWT(appClientId: string): Promise<string> {
  let token: string | undefined;

  try {
    token = await getCurrentCustomerJWT(appClientId);
  } catch {
    throw new DocumentsApiError('A current customer JWT could not be obtained.', 401);
  }

  if (!token) {
    throw new DocumentsApiError('A current customer JWT could not be obtained.', 401);
  }

  return token;
}

async function documentsFetch(path: string): Promise<Response> {
  const { apiUrl, appClientId } = getDocumentsServiceConfig();
  const token = await getDocumentsJWT(appClientId);
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new DocumentsApiError(
      `Documents API request failed with status ${response.status}.`,
      response.status,
    );
  }

  return response;
}

export async function getDocuments({
  offset,
  limit,
  documentTypes,
}: DocumentsRequestParams): Promise<DocumentsResponse> {
  const searchParams = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString(),
    sortBy: 'filename',
    sortDir: 'asc',
  });
  documentTypes.forEach((documentType) => {
    searchParams.append('tipoDoc', documentType.toString());
  });
  const response = await documentsFetch(`/api/v1/documents?${searchParams.toString()}`);

  return response.json() as Promise<DocumentsResponse>;
}

function getFileNameFromContentDisposition(value: string | null): string | undefined {
  if (!value) return undefined;

  const encodedFileName = /filename\*=UTF-8''([^;]+)/i.exec(value)?.[1];
  if (encodedFileName) {
    try {
      return decodeURIComponent(encodedFileName);
    } catch {
      return encodedFileName;
    }
  }

  return /filename="?([^";]+)"?/i.exec(value)?.[1];
}

export async function getDocument(documentId: number): Promise<DocumentDownload> {
  const response = await documentsFetch(`/api/v1/documents/${documentId}`);

  return {
    blob: await response.blob(),
    fileName: getFileNameFromContentDisposition(response.headers.get('content-disposition')),
  };
}
