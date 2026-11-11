import { builder, faker, http, HttpResponse, startMockServer } from 'tests/test-utils';

import { Environment } from '@/types';

import { DocumentsApiError, getDocument, getDocuments } from './api';
import { DocumentsRequestParams } from './types';

const { server } = startMockServer();

const API_URL = 'https://rtpc12l9k0.execute-api.eu-central-1.amazonaws.com/sandbox';
const buildDocumentsRequestWith = builder<DocumentsRequestParams>(() => ({
  offset: 0,
  limit: 10,
  documentType: undefined,
  sortBy: 'datareg',
  sortDir: 'desc',
}));

describe('documents API', () => {
  beforeEach(() => {
    window.B3.setting.environment = Environment.Staging;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it.each(['customer JWT', 'documents'])(
    'ends the request when the %s service does not respond',
    async (stalledService) => {
      vi.useFakeTimers();
      const requestStarted = vi.fn();
      server.use(
        http.get(`${window.origin}/customer/current.jwt`, () => {
          if (stalledService === 'customer JWT') {
            requestStarted();
            return new Promise<never>(() => {});
          }
          return HttpResponse.text(faker.string.uuid());
        }),
        http.get(`${API_URL}/api/v1/documents`, () => {
          requestStarted();
          return new Promise<never>(() => {});
        }),
      );

      const request = getDocuments(buildDocumentsRequestWith('WHATEVER_VALUES'));
      const rejection = expect(request).rejects.toMatchObject({ status: 408 });
      await vi.waitFor(() => expect(requestStarted).toHaveBeenCalledOnce());
      await vi.advanceTimersByTimeAsync(30_000);
      await rejection;
    },
  );

  it('cancels an in-flight documents request when the caller aborts', async () => {
    const controller = new AbortController();
    const requestStarted = vi.fn();
    const aborted = vi.fn();
    server.use(
      http.get(`${window.origin}/customer/current.jwt`, () =>
        HttpResponse.text(faker.string.uuid()),
      ),
      http.get(`${API_URL}/api/v1/documents`, ({ request }) => {
        request.signal.addEventListener('abort', aborted);
        requestStarted();
        return new Promise<never>(() => {});
      }),
    );

    const request = getDocuments(buildDocumentsRequestWith('WHATEVER_VALUES'), controller.signal);
    const rejection = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(requestStarted).toHaveBeenCalledOnce());
    controller.abort();
    await rejection;
    expect(aborted).toHaveBeenCalledOnce();
  });

  it('gets a customer JWT and requests a sorted page of documents', async () => {
    const token = faker.string.uuid();
    const requestSpy = vi.fn();

    server.use(
      http.get(`${window.origin}/customer/current.jwt`, ({ request }) => {
        expect(new URL(request.url).searchParams.get('app_client_id')).toBe(
          'ooty5p0sanjii578e42z4mqbjj527av',
        );
        return HttpResponse.text(token);
      }),
      http.get(`${API_URL}/api/v1/documents`, ({ request }) => {
        requestSpy(request);
        return HttpResponse.json({
          data: [],
          paging: { total: 0, offset: 20, limit: 20 },
        });
      }),
    );

    await getDocuments({
      offset: 20,
      limit: 20,
      documentType: 23,
      sortBy: 'filename',
      sortDir: 'asc',
    });

    const request = requestSpy.mock.calls[0][0] as Request;
    const url = new URL(request.url);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      offset: '20',
      limit: '20',
      sortBy: 'filename',
      sortDir: 'asc',
      tipoDoc: '23',
    });
    expect(url.searchParams.getAll('tipoDoc')).toEqual(['23']);
    expect(request.headers.get('authorization')).toBe(`Bearer ${token}`);
  });

  it('uses the staging service configuration during local development', async () => {
    window.B3.setting.environment = Environment.Local;

    server.use(
      http.get(`${window.origin}/customer/current.jwt`, () =>
        HttpResponse.text(faker.string.uuid()),
      ),
      http.get(`${API_URL}/api/v1/documents`, () =>
        HttpResponse.json({ data: [], paging: { total: 0, offset: 0, limit: 10 } }),
      ),
    );

    await expect(
      getDocuments({
        offset: 0,
        limit: 10,
        documentType: undefined,
        sortBy: 'datareg',
        sortDir: 'desc',
      }),
    ).resolves.toEqual({
      data: [],
      paging: { total: 0, offset: 0, limit: 10 },
    });
  });

  it('uses an explicitly configured documents service when the runtime environment is missing', async () => {
    window.B3.setting.environment = '';
    vi.stubEnv('VITE_DOCUMENTS_API_URL', API_URL);
    vi.stubEnv('VITE_DOCUMENTS_APP_CLIENT_ID', faker.string.alphanumeric());

    server.use(
      http.get(`${window.origin}/customer/current.jwt`, () =>
        HttpResponse.text(faker.string.uuid()),
      ),
      http.get(`${API_URL}/api/v1/documents`, () =>
        HttpResponse.json({ data: [], paging: { total: 0, offset: 0, limit: 10 } }),
      ),
    );

    await expect(
      getDocuments({
        offset: 0,
        limit: 10,
        documentType: undefined,
        sortBy: 'datareg',
        sortDir: 'desc',
      }),
    ).resolves.toEqual({
      data: [],
      paging: { total: 0, offset: 0, limit: 10 },
    });
  });

  it('downloads a document and reads its encoded filename', async () => {
    const documentId = faker.number.int();
    const fileName = `${faker.system.fileName()}.pdf`;
    const contents = faker.string.alpha();
    const token = faker.string.uuid();
    const requestSpy = vi.fn();

    server.use(
      http.get(`${window.origin}/customer/current.jwt`, () => HttpResponse.text(token)),
      http.get(`${API_URL}/api/v1/documents/${documentId}`, ({ request }) => {
        requestSpy(request);
        return HttpResponse.text(contents, {
          headers: {
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          },
        });
      }),
    );

    const result = await getDocument(documentId);
    const request = requestSpy.mock.calls[0][0] as Request;

    expect(request.method).toBe('GET');
    expect(request.url).toBe(`${API_URL}/api/v1/documents/${documentId}`);
    expect(request.headers.get('authorization')).toBe(`Bearer ${token}`);
    expect(result.fileName).toBe(fileName);
    const reader = new FileReader();
    const blobText = new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
    });
    reader.readAsText(result.blob);
    expect(await blobText).toBe(contents);
  });

  it('rejects the request when the current customer JWT is unavailable', async () => {
    server.use(
      http.get(`${window.origin}/customer/current.jwt`, () =>
        HttpResponse.text('', { status: 401 }),
      ),
    );

    await expect(
      getDocuments({
        offset: 0,
        limit: 10,
        documentType: undefined,
        sortBy: 'datareg',
        sortDir: 'desc',
      }),
    ).rejects.toEqual(expect.objectContaining<Partial<DocumentsApiError>>({ status: 401 }));
  });

  it('reports document service HTTP errors', async () => {
    server.use(
      http.get(`${window.origin}/customer/current.jwt`, () =>
        HttpResponse.text(faker.string.uuid()),
      ),
      http.get(`${API_URL}/api/v1/documents`, () => HttpResponse.json({}, { status: 503 })),
    );

    await expect(
      getDocuments({
        offset: 0,
        limit: 10,
        documentType: undefined,
        sortBy: 'datareg',
        sortDir: 'desc',
      }),
    ).rejects.toEqual(expect.objectContaining<Partial<DocumentsApiError>>({ status: 503 }));
  });
});
