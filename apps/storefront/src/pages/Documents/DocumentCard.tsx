import { Button, Card, CardContent, Stack, Typography } from '@mui/material';

import { useB3Lang } from '@/lib/lang';

import { DocumentItem } from './types';

interface DocumentCardProps {
  document: DocumentItem;
  documentTypeLabel: string;
  isDownloading: boolean;
  onDownload: (document: DocumentItem) => void;
}

export function DocumentCard({
  document,
  documentTypeLabel,
  isDownloading,
  onDownload,
}: DocumentCardProps) {
  const b3Lang = useB3Lang();

  return (
    <Card>
      <CardContent>
        <Stack spacing={1}>
          <Button
            type="button"
            variant="text"
            disabled={isDownloading}
            onClick={() => onDownload(document)}
            aria-label={b3Lang('documents.download', { fileName: document.fileName })}
            sx={{
              alignSelf: 'flex-start',
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
          <Typography variant="body2" color="text.secondary">
            {b3Lang('documents.documentType')}: {documentTypeLabel}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
