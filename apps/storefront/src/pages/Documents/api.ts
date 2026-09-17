import { getCurrentCustomerJWT } from '@/shared/service/bc/api/login';
import { getEnvironment } from '@/shared/service/request/base';
import { Environment } from '@/types';
import b2bLogger from '@/utils/b3Logger';

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

function logDocumentsDiagnostic(message: string, details?: Record<string, unknown>) {
  if (import.meta.env.MODE !== 'test') {
    b2bLogger.log(`[Documents] ${message}`, details ?? '');
  }
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
  const hasExplicitServiceConfig = Boolean(
    import.meta.env.VITE_DOCUMENTS_API_URL && import.meta.env.VITE_DOCUMENTS_APP_CLIENT_ID,
  );

  logDocumentsDiagnostic('Resolving service configuration', {
    environment,
    runtimeEnvironment: window.B3?.setting?.environment,
    platform: window.B3?.setting?.platform,
    hasExplicitServiceConfig,
    apiUrl: STAGING_DOCUMENTS_API_URL,
  });

  if (
    environment === Environment.Local ||
    environment === Environment.Staging ||
    hasExplicitServiceConfig
  ) {
    logDocumentsDiagnostic('Service configuration accepted', {
      environment,
      hasExplicitServiceConfig,
    });
    return {
      apiUrl: STAGING_DOCUMENTS_API_URL,
      appClientId: STAGING_DOCUMENTS_APP_CLIENT_ID,
    };
  }

  logDocumentsDiagnostic('Service configuration rejected', { environment });
  // TODO: configure VITE_DOCUMENTS_API_URL and VITE_DOCUMENTS_APP_CLIENT_ID for production.
  throw new DocumentsApiError('The documents service is not configured for this environment.');
}

async function getDocumentsJWT(appClientId: string): Promise<string> {
  let token: string | undefined;

  logDocumentsDiagnostic('Requesting current customer JWT', {
    platform: window.B3?.setting?.platform,
    hasAppClientId: Boolean(appClientId),
  });

  try {
    token = await getCurrentCustomerJWT(appClientId);
  } catch (error) {
    logDocumentsDiagnostic('Current customer JWT request failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new DocumentsApiError('A current customer JWT could not be obtained.', 401);
  }

  logDocumentsDiagnostic('Current customer JWT request completed', {
    hasToken: Boolean(token),
  });

  if (!token) {
    throw new DocumentsApiError('A current customer JWT could not be obtained.', 401);
  }

  return token;
}

async function documentsFetch(path: string): Promise<Response> {
  const { apiUrl, appClientId } = getDocumentsServiceConfig();
  const token = await getDocumentsJWT(appClientId);
  const requestUrl = `${apiUrl}${path}`;

  logDocumentsDiagnostic('Sending API request', { requestUrl });
  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  logDocumentsDiagnostic('API response received', {
    requestUrl,
    status: response.status,
    ok: response.ok,
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
  documentType,
  sortBy,
  sortDir,
}: DocumentsRequestParams): Promise<DocumentsResponse> {
  logDocumentsDiagnostic('Loading documents', {
    offset,
    limit,
    documentType,
    sortBy,
    sortDir,
  });

  const searchParams = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString(),
    sortBy,
    sortDir,
  });
  if (documentType !== undefined) searchParams.set('tipoDoc', documentType.toString());
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
