import {
  builder,
  faker,
  http,
  HttpResponse,
  renderWithProviders,
  screen,
  startMockServer,
  userEvent,
  waitFor,
  within,
} from 'tests/test-utils';

import { Environment } from '@/types';

import { DocumentItem, DocumentsResponse } from './types';
import Documents from '.';

const { server } = startMockServer();

const API_URL = 'https://rtpc12l9k0.execute-api.eu-central-1.amazonaws.com/sandbox';

const buildDocumentWith = builder<DocumentItem>(() => ({
  documentId: faker.number.int(),
  fileName: faker.system.fileName(),
  documentType: 3,
  documentTypeLabel: faker.commerce.department(),
}));

const buildDocumentsResponseWith = builder<DocumentsResponse>(() => ({
  data: [buildDocumentWith('WHATEVER_VALUES')],
  paging: { total: 1, offset: 0, limit: 10 },
}));

function mockCustomerJWT() {
  server.use(
    http.get(`${window.origin}/customer/current.jwt`, () => HttpResponse.text(faker.string.uuid())),
  );
}

describe('Documents page', () => {
  beforeEach(() => {
    window.B3.setting.environment = Environment.Staging;
    mockCustomerJWT();
    window.URL.createObjectURL = vi.fn(() => 'blob:document');
    window.URL.revokeObjectURL = vi.fn();
  });

  it('loads the default page and displays document details', async () => {
    const document = buildDocumentWith('WHATEVER_VALUES');
    const requestSpy = vi.fn();
    server.use(
      http.get(`${API_URL}/api/v1/documents`, ({ request }) => {
        requestSpy(request);
        return HttpResponse.json(
          buildDocumentsResponseWith({
            data: [document],
            paging: { total: 1, offset: 0, limit: 10 },
          }),
        );
      }),
    );

    renderWithProviders(<Documents />, { initialEntries: ['/documents'] });

    const row = await screen.findByRole('row', { name: new RegExp(document.fileName, 'i') });
    expect(within(row).getByText('Invoices')).toBeInTheDocument();
    expect(within(row).queryByText(document.documentTypeLabel)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('combobox', { name: 'Document type' }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'All',
      'Offers',
      'Orders',
      'Delivery notes',
      'Invoices',
    ]);

    const url = new URL((requestSpy.mock.calls[0][0] as Request).url);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      offset: '0',
      limit: '10',
      sortBy: 'filename',
      sortDir: 'asc',
    });
    expect(url.searchParams.has('tipoDoc')).toBe(false);
  });

  it('displays document types using the filter category labels', async () => {
    const documents = [
      buildDocumentWith({ documentType: 164 }),
      buildDocumentWith({ documentType: 27 }),
      buildDocumentWith({ documentType: 1002 }),
      buildDocumentWith({ documentType: 191 }),
    ];
    server.use(
      http.get(`${API_URL}/api/v1/documents`, () =>
        HttpResponse.json(
          buildDocumentsResponseWith({
            data: documents,
            paging: { total: documents.length, offset: 0, limit: 10 },
          }),
        ),
      ),
    );

    renderWithProviders(<Documents />, { initialEntries: ['/documents'] });

    expect(await screen.findByText('Offers')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Delivery notes')).toBeInTheDocument();
    expect(screen.getByText('Invoices')).toBeInTheDocument();
    documents.forEach((document) => {
      expect(screen.queryByText(document.documentTypeLabel)).not.toBeInTheDocument();
    });
  });

  it('restores pagination and document type from the URL', async () => {
    const requestSpy = vi.fn();
    server.use(
      http.get(`${API_URL}/api/v1/documents`, ({ request }) => {
        requestSpy(request);
        return HttpResponse.json(
          buildDocumentsResponseWith({ data: [], paging: { total: 0, offset: 20, limit: 20 } }),
        );
      }),
    );

    renderWithProviders(<Documents />, {
      initialEntries: ['/documents?offset=20&limit=20&tipoDoc=orders'],
    });

    await screen.findByText('No documents');

    const url = new URL((requestSpy.mock.calls[0][0] as Request).url);
    expect(url.searchParams.get('offset')).toBe('20');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.getAll('tipoDoc')).toEqual(['23', '27']);
    expect(screen.getByRole('combobox', { name: 'Document type' })).toHaveTextContent('Orders');
  });

  it('changes the document type and resets the offset', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/documents`, () =>
        HttpResponse.json(
          buildDocumentsResponseWith({ paging: { total: 40, offset: 30, limit: 10 } }),
        ),
      ),
    );

    const { navigation } = renderWithProviders(<Documents />, {
      initialEntries: ['/documents?offset=30&limit=10&tipoDoc=invoices'],
    });

    await screen.findByRole('table');
    await userEvent.click(screen.getByRole('combobox', { name: 'Document type' }));
    await userEvent.click(screen.getByRole('option', { name: 'Offers' }));

    await waitFor(() => {
      expect(navigation).toHaveBeenLastCalledWith('/documents?offset=0&limit=10&tipoDoc=offers');
    });
  });

  it('updates the URL when moving to the next page', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/documents`, () =>
        HttpResponse.json(
          buildDocumentsResponseWith({ paging: { total: 25, offset: 0, limit: 10 } }),
        ),
      ),
    );

    const { navigation } = renderWithProviders(<Documents />, { initialEntries: ['/documents'] });

    await screen.findByRole('table');
    await userEvent.click(screen.getByRole('button', { name: 'Go to next page' }));

    await waitFor(() => {
      expect(navigation).toHaveBeenLastCalledWith('/documents?offset=10&limit=10&tipoDoc=all');
    });
  });

  it('resets the offset when changing the number of rows per page', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/documents`, () =>
        HttpResponse.json(
          buildDocumentsResponseWith({ paging: { total: 40, offset: 10, limit: 10 } }),
        ),
      ),
    );

    const { navigation } = renderWithProviders(<Documents />, {
      initialEntries: ['/documents?offset=10&limit=10&tipoDoc=ddt'],
    });

    await screen.findByRole('table');
    await userEvent.click(screen.getByRole('combobox', { name: 'Rows per page:' }));
    await userEvent.click(screen.getByRole('option', { name: '20' }));

    await waitFor(() => {
      expect(navigation).toHaveBeenLastCalledWith('/documents?offset=0&limit=20&tipoDoc=ddt');
    });
  });

  it('downloads a document using the response filename', async () => {
    const document = buildDocumentWith('WHATEVER_VALUES');
    const downloadFileName = faker.system.fileName();
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    server.use(
      http.get(`${API_URL}/api/v1/documents`, () =>
        HttpResponse.json(buildDocumentsResponseWith({ data: [document] })),
      ),
      http.get(`${API_URL}/api/v1/documents/${document.documentId}`, () =>
        HttpResponse.arrayBuffer(new ArrayBuffer(2), {
          headers: { 'Content-Disposition': `attachment; filename="${downloadFileName}"` },
        }),
      ),
    );

    renderWithProviders(<Documents />, { initialEntries: ['/documents'] });

    await userEvent.click(
      await screen.findByRole('button', { name: `Download ${document.fileName}` }),
    );

    await waitFor(() => expect(anchorClick).toHaveBeenCalled());
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:document');
  });

  it('shows an error with a retry action when loading fails', async () => {
    server.use(
      http.get(`${API_URL}/api/v1/documents`, () => HttpResponse.json({}, { status: 500 })),
    );

    renderWithProviders(<Documents />, { initialEntries: ['/documents'] });

    expect(await screen.findByText('Documents could not be loaded.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('shows an error notification when a document download fails', async () => {
    const document = buildDocumentWith('WHATEVER_VALUES');
    server.use(
      http.get(`${API_URL}/api/v1/documents`, () =>
        HttpResponse.json(buildDocumentsResponseWith({ data: [document] })),
      ),
      http.get(`${API_URL}/api/v1/documents/${document.documentId}`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );

    renderWithProviders(<Documents />, { initialEntries: ['/documents'] });

    await userEvent.click(
      await screen.findByRole('button', { name: `Download ${document.fileName}` }),
    );

    expect(await screen.findByText('The document could not be downloaded.')).toBeInTheDocument();
  });
});
