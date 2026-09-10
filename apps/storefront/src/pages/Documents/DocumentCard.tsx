import { PictureAsPdf } from '@mui/icons-material';
import { Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';

import { useB3Lang } from '@/lib/lang';

import { getDisplayedFileName, isPdfFile } from './fileName';
import { DocumentItem } from './types';

interface DocumentCardProps {
  document: DocumentItem;
  documentTypeLabel: string;
  registrationDate: string;
  isDownloading: boolean;
  onDownload: (document: DocumentItem) => void;
}

export function DocumentCard({
  document,
  documentTypeLabel,
  registrationDate,
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
            aria-busy={isDownloading}
            onClick={() => onDownload(document)}
            aria-label={b3Lang('documents.download', { fileName: document.fileName })}
            startIcon={
              isPdfFile(document.fileName) ? (
                <PictureAsPdf color="error" fontSize="small" titleAccess="PDF" />
              ) : undefined
            }
            endIcon={
              isDownloading ? (
                <CircularProgress
                  size={16}
                  color="inherit"
                  aria-label={b3Lang('documents.download', { fileName: document.fileName })}
                />
              ) : undefined
            }
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
            {getDisplayedFileName(document.fileName)}
          </Button>
          <Typography variant="body2" color="text.secondary">
            {b3Lang('documents.documentType')}: {documentTypeLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {b3Lang('documents.registrationDate')}: {registrationDate}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
