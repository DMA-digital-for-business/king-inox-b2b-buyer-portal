import { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

import { useB3Lang } from '@/lib/lang';

import QuoteSkeleton from './QuoteSkeleton';

const logoUrl = new URL('../../../../../../public/images/logo-king-inox.png', import.meta.url).href;

interface QuoteLoadingProps {
  busy: boolean;
  children: ReactNode;
  loadingLabel?: string;
}

export default function QuoteLoading({ busy, children, loadingLabel }: QuoteLoadingProps) {
  const b3Lang = useB3Lang();
  const label = loadingLabel ?? b3Lang('global.tips.loading');

  return (
    <Box aria-busy={busy} sx={{ display: 'grid', width: '100%', minWidth: 0 }}>
      <Box
        ref={(element: HTMLDivElement | null) => {
          if (element) element.inert = busy;
        }}
        aria-hidden={busy || undefined}
        sx={{
          gridArea: '1 / 1',
          minWidth: 0,
          pointerEvents: busy ? 'none' : 'auto',
          visibility: busy ? 'hidden' : 'visible',
        }}
      >
        {children}
      </Box>
      {busy && (
        <Box
          role="status"
          aria-live="polite"
          aria-label={label}
          sx={{ gridArea: '1 / 1', minWidth: 0, alignSelf: 'start', position: 'relative' }}
        >
          <QuoteSkeleton />
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
              width: 156,
              minHeight: 156,
              boxSizing: 'border-box',
              p: 2.5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              pointerEvents: 'none',
            }}
          >
            <Box
              component="img"
              src={logoUrl}
              alt="King inox"
              sx={{ width: 100, height: 64, objectFit: 'contain' }}
            />
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
              {b3Lang('global.tips.loading')}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
