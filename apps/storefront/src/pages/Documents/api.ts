import { getCurrentCustomerJWT } from '@/shared/service/bc/api/login';
import { getEnvironment } from '@/shared/service/request/base';
import { Environment } from '@/types';
import b2bLogger from '@/utils/b3Logger';

import { DocumentDownload, DocumentsRequestParams, DocumentsResponse } from './types';

const DOCUMENTS_API_URL = import.meta.env.VITE_DOCUMENTS_API_URL ;
const STAGING_DOCUMENTS_APP_CLIENT_ID = import.meta.env.VITE_DOCUMENTS_APP_CLIENT_ID;
const DOCUMENTS_REQUEST_TIMEOUT_MS = 30_000;

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
    apiUrl: DOCUMENTS_API_URL,
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
      apiUrl: DOCUMENTS_API_URL,
      appClientId: STAGING_DOCUMENTS_APP_CLIENT_ID,
    };
  }

  logDocumentsDiagnostic('Service configuration rejected', { environment });
  // TODO: configure VITE_DOCUMENTS_API_URL and VITE_DOCUMENTS_APP_CLIENT_ID for production.
  throw new DocumentsApiError('The documents service is not configured for this environment.');
}

async function getDocumentsJWT(appClientId: string, signal: AbortSignal): Promise<string> {
  let token: string | undefined;

  logDocumentsDiagnostic('Requesting current customer JWT', {
    platform: window.B3?.setting?.platform,
    hasAppClientId: Boolean(appClientId),
  });

  try {
    token = await getCurrentCustomerJWT(appClientId, signal);
  } catch (error) {
    if (signal.aborted) throw error;
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

async function documentsFetch<T>(
  path: string,
  readResponse: (response: Response) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const { apiUrl, appClientId } = getDocumentsServiceConfig();
  const requestUrl = `${apiUrl}${path}`;
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    logDocumentsDiagnostic('Request timed out', {
      requestUrl,
      timeoutMs: DOCUMENTS_REQUEST_TIMEOUT_MS,
    });
    controller.abort();
  }, DOCUMENTS_REQUEST_TIMEOUT_MS);

  try {
    const token = await getDocumentsJWT(appClientId, controller.signal);
    logDocumentsDiagnostic('Sending API request', { requestUrl });
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
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

    return await readResponse(response);
  } catch (error) {
    if (timedOut) {
      throw new DocumentsApiError('The documents request timed out.', 408);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export async function getDocuments(
  { offset, limit, documentType, sortBy, sortDir }: DocumentsRequestParams,
  signal?: AbortSignal,
): Promise<DocumentsResponse> {
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
  return documentsFetch(
    `/api/v1/documents?${searchParams.toString()}`,
    (response) => response.json() as Promise<DocumentsResponse>,
    signal,
  );
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
  return documentsFetch(`/api/v1/documents/${documentId}`, async (response) => ({
    blob: await response.blob(),
    fileName: getFileNameFromContentDisposition(response.headers.get('content-disposition')),
  }));
}
