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
  registrationDate: faker.date.past().toISOString(),
}));

it('displays documents as cards on mobile', async () => {
  vi.spyOn(document.body, 'clientWidth', 'get').mockReturnValue(500);
  window.B3.setting.environment = Environment.Staging;
  const displayFileName = faker.system.fileName();
  const documentItem = buildDocumentWith({ fileName: `${displayFileName}.pdf` });

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
  expect(screen.getByText(/Document type: Orders/)).toBeInTheDocument();
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
