import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';

export interface ShoppingListPdfRow {
  product: string;
  sku: string;
  measure: string;
  price: string;
  box: string;
  masterCarton: string;
  pallet: string;
  quantity: string;
  total: string;
  note?: string;
}

export interface ShoppingListPdfData {
  id: string;
  name: string;
  description: string;
  company: string;
  createdBy: string;
  rows: ShoppingListPdfRow[];
  labels: {
    title: string;
    product: string;
    price: string;
    quantity: string;
    total: string;
    createdBy: string;
    page: string;
  };
}

export function buildShoppingListPdfDocument(data: ShoppingListPdfData): TDocumentDefinitions {
  const headers = [
    data.labels.product,
    'Misura',
    data.labels.price,
    'Box',
    'M. Carton',
    'Pallet',
    data.labels.quantity,
    data.labels.total,
  ];
  const body: TableCell[][] = [
    headers.map((text) => ({ text, bold: true, fillColor: '#eef2f8', color: '#2b3138' })),
  ];
  data.rows.forEach((row) => {
    body.push([
      {
        stack: [
          { text: row.product, bold: true },
          { text: row.sku, color: '#6b7278', fontSize: 8, margin: [0, 3, 0, 0] },
          ...(row.note
            ? [{ text: row.note, color: '#6b7278', fontSize: 8, margin: [0, 3, 0, 0] } as Content]
            : []),
        ],
      },
      row.measure,
      row.price,
      row.box,
      row.masterCarton,
      row.pallet,
      row.quantity,
      row.total,
    ]);
  });
  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 30, 30, 40],
    defaultStyle: { font: 'Roboto', fontSize: 9, color: '#2b3138' },
    info: { title: `${data.labels.title} - ${data.name}`, author: data.company },
    content: [
      { text: 'KING INOX', fontSize: 12, bold: true, color: '#3f6aa0' },
      { text: data.labels.title, fontSize: 20, bold: true, margin: [0, 12, 0, 5] },
      { text: data.name, fontSize: 14, margin: [0, 0, 0, 5] },
      { text: data.company, margin: [0, 0, 0, 5] },
      { text: data.description, color: '#6b7278', margin: [0, 0, 0, 5] },
      { text: `${data.labels.createdBy} ${data.createdBy}`, margin: [0, 0, 0, 16] },
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: ['*', 65, 75, 45, 50, 45, 45, 75],
          body,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e3e7eb',
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
      },
    ],
    footer: (page, pages) => ({
      text: `${data.labels.page} ${page} / ${pages}`,
      alignment: 'right',
      margin: [30, 10, 30, 0],
      fontSize: 8,
      color: '#6b7278',
    }),
  };
}

export async function downloadShoppingListPdf(data: ShoppingListPdfData): Promise<void> {
  const [pdfMake, fonts, { resolvePdfMakeVirtualFileSystem }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
    import('@/pages/quote/components/quotePdf'),
  ]);
  const pdf = pdfMake.createPdf(
    buildShoppingListPdfDocument(data),
    undefined,
    undefined,
    resolvePdfMakeVirtualFileSystem(fonts),
  );
  const safeId = data.id.replace(/[^a-zA-Z0-9_-]/g, '-');
  await new Promise<void>((resolve) => {
    pdf.download(`Shopping-list-${safeId}.pdf`, resolve);
  });
}
