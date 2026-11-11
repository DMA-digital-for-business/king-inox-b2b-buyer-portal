import {
  builder,
  faker,
  http,
  HttpResponse,
  renderWithProviders,
  screen,
  startMockServer,
} from 'tests/test-utils';

import { Environment } from '@/types';

import { DocumentItem } from './types';
import Documents from '.';

const { server } = startMockServer();

const buildDocumentWith = builder<DocumentItem>(() => ({
  documentId: faker.number.int(),
  fileName: faker.system.fileName(),
  documentType: 23,
  documentTypeLabel: faker.commerce.department(),
  reference: faker.string.alphanumeric(),
  registrationDate: faker.date.past().toISOString(),
  status: faker.word.sample(),
}));

it.each([320, 500, 768, 900, 1023, 1024])('adapts the document layout at %i px', async (width) => {
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: query === '(max-width:1023px)' && width <= 1023,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  window.B3.setting.environment = Environment.Staging;
  const displayFileName = faker.system.fileName();
  const reference = faker.string.alphanumeric(100);
  const documentItem = buildDocumentWith({
    fileName: `${displayFileName}.pdf`,
    status: 'VALIDA',
    reference,
  });

  server.use(
    http.get(`${window.origin}/customer/current.jwt`, () => HttpResponse.text(faker.string.uuid())),
    http.get(
      'https://rtpc12l9k0.execute-api.eu-central-1.amazonaws.com/sandbox/api/v1/documents',
      () =>
        HttpResponse.json({
          data: [documentItem],
          paging: { total: 1, offset: 0, limit: 10 },
        }),
    ),
  );

  renderWithProviders(<Documents />, { initialEntries: ['/documents?tipoDoc=orders'] });

  expect(await screen.findByText(displayFileName)).toBeInTheDocument();
  expect(screen.queryByText(documentItem.fileName)).not.toBeInTheDocument();
  expect(screen.getByTitle('PDF')).toBeInTheDocument();
  if (width >= 1024) {
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText(reference)).toBeInTheDocument();
    expect(screen.queryByText(/Document type: Orders/)).not.toBeInTheDocument();
    return;
  }

  expect(screen.getByText(/Document type: Orders/)).toBeInTheDocument();
  expect(screen.getByText(`Your code: ${documentItem.reference}`)).toBeInTheDocument();
  expect(screen.getByText('Status: Valid')).toBeInTheDocument();
  expect(screen.getByText(/Registration date:/)).toHaveTextContent(
    new Intl.DateTimeFormat('en', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(documentItem.registrationDate)),
  );
  expect(screen.queryByText(new RegExp(documentItem.documentTypeLabel))).not.toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
