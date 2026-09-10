import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';

import B3Spin from '@/components/spin/B3Spin';
import { B3Table, TableColumnItem } from '@/components/table/B3Table';
import { useMobile } from '@/hooks/useMobile';
import { useB3Lang } from '@/lib/lang';
import { snackbar } from '@/utils/b3Tip';

import { getDocument, getDocuments } from './api';
import { DocumentCard } from './DocumentCard';
import {
  DOCUMENT_TYPE_FILTERS,
  DocumentItem,
  DocumentTypeCategory,
  DocumentTypeFilter,
  getDocumentTypeCategory,
} from './types';

const DEFAULT_OFFSET = 0;
const DEFAULT_LIMIT = 10;
const DEFAULT_DOCUMENT_TYPE_FILTER: DocumentTypeFilter = 'all';
const ROWS_PER_PAGE = [10, 20, 30];
const DOCUMENT_TYPE_LABEL_KEYS: Record<DocumentTypeCategory, string> = {
  offers: 'documents.typeOffers',
  orders: 'documents.typeOrders',
  ddt: 'documents.typeDdt',
  invoices: 'documents.typeInvoices',
};

function parseOffset(value: string | null): number {
  const offset = Number(value);
  return Number.isInteger(offset) && offset >= 0 ? offset : DEFAULT_OFFSET;
}

function parseLimit(value: string | null): number {
  const limit = Number(value);
  return ROWS_PER_PAGE.includes(limit) ? limit : DEFAULT_LIMIT;
}

function parseDocumentTypeFilter(value: string | null): DocumentTypeFilter {
  if (value && value in DOCUMENT_TYPE_FILTERS) {
    return value as DocumentTypeFilter;
  }

  return DEFAULT_DOCUMENT_TYPE_FILTER;
}

function sanitizeFileName(fileName: string): string {
  return fileName.split(/[\\/]/).pop() || 'document';
}

export default function Documents() {
  const b3Lang = useB3Lang();
  const [isMobile] = useMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<number>();

  const offset = parseOffset(searchParams.get('offset'));
  const limit = parseLimit(searchParams.get('limit'));
  const documentTypeFilter = parseDocumentTypeFilter(searchParams.get('tipoDoc'));

  const getDocumentTypeLabel = (documentType: number) => {
    const category = getDocumentTypeCategory(documentType);
    return category ? b3Lang(DOCUMENT_TYPE_LABEL_KEYS[category]) : '—';
  };

  const documentsQuery = useQuery({
    queryKey: ['documents', offset, limit, documentTypeFilter],
    queryFn: () =>
      getDocuments({
        offset,
        limit,
        documentTypes: DOCUMENT_TYPE_FILTERS[documentTypeFilter],
      }),
  });

  const updateSearchParams = (values: Record<string, number | string>) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      Object.entries(values).forEach(([key, value]) => nextParams.set(key, value.toString()));
      return nextParams;
    });
  };

  const handleDocumentTypeChange = (event: SelectChangeEvent) => {
    updateSearchParams({
      tipoDoc: parseDocumentTypeFilter(event.target.value),
      offset: DEFAULT_OFFSET,
      limit,
    });
  };

  const handleDownload = async (document: DocumentItem) => {
    try {
      setDownloadingDocumentId(document.documentId);
      const { blob, fileName } = await getDocument(document.documentId);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = sanitizeFileName(fileName || document.fileName);
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      snackbar.error(b3Lang('documents.downloadError'));
    } finally {
      setDownloadingDocumentId(undefined);
    }
  };

  const columns: TableColumnItem<DocumentItem>[] = [
    {
      key: 'fileName',
      title: b3Lang('documents.fileName'),
      render: (document) => (
        <Button
          type="button"
          variant="text"
          disabled={downloadingDocumentId === document.documentId}
          onClick={() => handleDownload(document)}
          aria-label={b3Lang('documents.download', { fileName: document.fileName })}
          sx={{
            justifyContent: 'flex-start',
            minWidth: 0,
            p: 0,
            overflowWrap: 'anywhere',
            textAlign: 'left',
            textTransform: 'none',
          }}
        >
          {document.fileName}
        </Button>
      ),
    },
    {
      key: 'documentType',
      title: b3Lang('documents.documentType'),
      render: (document) => getDocumentTypeLabel(document.documentType),
    },
  ];

  const documents = documentsQuery.data?.data ?? [];
  const total = documentsQuery.data?.paging.total ?? 0;

  return (
    <Stack spacing={3}>
      <Box sx={{ width: { xs: '100%', sm: 220 } }}>
        <FormControl fullWidth variant="filled" size="small">
          <InputLabel id="documents-type-label">{b3Lang('documents.filterLabel')}</InputLabel>
          <Select
            labelId="documents-type-label"
            value={documentTypeFilter}
            onChange={handleDocumentTypeChange}
          >
            <MenuItem value="all">{b3Lang('documents.typeAll')}</MenuItem>
            <MenuItem value="offers">{b3Lang('documents.typeOffers')}</MenuItem>
            <MenuItem value="orders">{b3Lang('documents.typeOrders')}</MenuItem>
            <MenuItem value="ddt">{b3Lang('documents.typeDdt')}</MenuItem>
            <MenuItem value="invoices">{b3Lang('documents.typeInvoices')}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {documentsQuery.isError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => documentsQuery.refetch()}>
              {b3Lang('documents.retry')}
            </Button>
          }
        >
          {b3Lang('documents.loadError')}
        </Alert>
      ) : (
        <B3Spin isSpinning={documentsQuery.isFetching}>
          <B3Table
            columnItems={columns}
            listItems={documents}
            pagination={{ offset, first: limit, count: total }}
            onPaginationChange={({ offset: nextOffset, first: nextLimit }) => {
              updateSearchParams({
                offset: nextLimit === limit ? nextOffset : DEFAULT_OFFSET,
                limit: nextLimit,
                tipoDoc: documentTypeFilter,
              });
            }}
            rowsPerPageOptions={ROWS_PER_PAGE}
            isLoading={documentsQuery.isFetching}
            isCustomRender={isMobile}
            itemXs={12}
            tableKey="documentId"
            noDataText={b3Lang('documents.noData')}
            renderItem={(document) => (
              <DocumentCard
                document={document}
                documentTypeLabel={getDocumentTypeLabel(document.documentType)}
                isDownloading={downloadingDocumentId === document.documentId}
                onDownload={handleDownload}
              />
            )}
          />
        </B3Spin>
      )}
    </Stack>
  );
}
