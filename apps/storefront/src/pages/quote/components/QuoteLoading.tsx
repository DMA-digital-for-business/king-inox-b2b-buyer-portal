import { ReactNode } from 'react';
import { Box, LinearProgress } from '@mui/material';

import { useB3Lang } from '@/lib/lang';

interface QuoteLoadingProps {
  busy: boolean;
  children: ReactNode;
}

export default function QuoteLoading({ busy, children }: QuoteLoadingProps) {
  const b3Lang = useB3Lang();

  return (
    <Box aria-busy={busy} sx={{ position: 'relative', width: '100%' }}>
      <Box sx={{ height: 3, mb: 2, position: 'sticky', top: 0, zIndex: 2 }}>
        {busy && (
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
        sx={{ pointerEvents: busy ? 'none' : 'auto' }}
      >
        {children}
      </Box>
    </Box>
  );
}
