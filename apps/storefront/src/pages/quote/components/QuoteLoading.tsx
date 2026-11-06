import { ReactNode } from 'react';
import { Box, CircularProgress, LinearProgress, Typography } from '@mui/material';

import { useB3Lang } from '@/lib/lang';

interface QuoteLoadingProps {
  busy: boolean;
  children: ReactNode;
  coverContent?: boolean;
  loadingLabel?: string;
}

export default function QuoteLoading({
  busy,
  children,
  coverContent = false,
  loadingLabel,
}: QuoteLoadingProps) {
  const b3Lang = useB3Lang();
  const covered = busy && coverContent;

  return (
    <Box aria-busy={busy} sx={{ position: 'relative', width: '100%' }}>
      <Box sx={{ height: 3, mb: 2, position: 'sticky', top: 0, zIndex: 2 }}>
        {busy && !covered && (
          <LinearProgress
            aria-label={b3Lang('global.tips.loading')}
            sx={{
              height: 3,
              borderRadius: 2,
              backgroundColor: '#fff0e5',
              '& .MuiLinearProgress-bar': { backgroundColor: '#ff7a1a' },
              '@media (prefers-reduced-motion: reduce)': {
                '& .MuiLinearProgress-bar': { animation: 'none', transform: 'none' },
              },
            }}
          />
        )}
      </Box>
      <Box
        ref={(element: HTMLDivElement | null) => {
          if (element) element.inert = busy;
        }}
        aria-hidden={covered || undefined}
        sx={{ pointerEvents: busy ? 'none' : 'auto', visibility: covered ? 'hidden' : 'visible' }}
      >
        {children}
      </Box>
      {covered && (
        <Box
          sx={{
            position: 'fixed',
            inset: { xs: '12px', md: '24px' },
            zIndex: (theme) => theme.zIndex.modal,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            role="status"
            aria-live="polite"
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              gap: 2,
              py: 5,
              color: 'text.secondary',
            }}
          >
            <CircularProgress size={44} thickness={3} sx={{ color: '#ff7a1a' }} />
            <Typography variant="body2">
              {loadingLabel ?? b3Lang('quoteDraft.pdf.generating')}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
