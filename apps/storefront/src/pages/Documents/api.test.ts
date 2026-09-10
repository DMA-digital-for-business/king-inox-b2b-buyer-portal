import { faker, http, HttpResponse, startMockServer } from 'tests/test-utils';

import { Environment } from '@/types';

import { DocumentsApiError, getDocument, getDocuments } from './api';

const { server } = startMockServer();

const API_URL = 'https://rtpc12l9k0.execute-api.eu-central-1.amazonaws.com/sandbox';

describe('documents API', () => {
  beforeEach(() => {
    window.B3.setting.environment = Environment.Staging;
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
      documentTypes: [23, 27],
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
      tipoDoc: '27',
    });
    expect(url.searchParams.getAll('tipoDoc')).toEqual(['23', '27']);
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
        documentTypes: [],
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
    expect(await result.blob.text()).toBe(contents);
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
        documentTypes: [],
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
        documentTypes: [],
        sortBy: 'datareg',
        sortDir: 'desc',
      }),
    ).rejects.toEqual(expect.objectContaining<Partial<DocumentsApiError>>({ status: 503 }));
  });
});
