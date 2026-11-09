import { Box, Skeleton } from '@mui/material';

export default function QuoteSkeleton() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: '100%',
        pb: 4,
        '& .MuiSkeleton-root': { transform: 'none' },
        '@media (prefers-reduced-motion: reduce)': {
          '& .MuiSkeleton-root': { animation: 'none' },
        },
      }}
    >
      <Skeleton width={160} height={24} sx={{ mb: 2 }} />
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          gap: 3,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
            <Skeleton width={180} height={42} />
            <Skeleton variant="rounded" width={64} height={24} />
          </Box>
          <Skeleton width={100} height={18} sx={{ mb: 1 }} />
          <Skeleton width={240} height={18} />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {['download', 'offer', 'order'].map((action) => (
            <Skeleton
              key={action}
              variant="rounded"
              height={44}
              sx={{ width: { xs: '100%', sm: 150 } }}
            />
          ))}
        </Box>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          mb: 3,
        }}
      >
        {['contact', 'information', 'addresses'].map((section) => (
          <Box key={section} sx={{ p: 2.5 }}>
            <Skeleton width="50%" height={22} sx={{ mb: 2 }} />
            <Skeleton width="80%" height={16} sx={{ mb: 1.5 }} />
            <Skeleton width="65%" height={16} sx={{ mb: 1.5 }} />
            <Skeleton width="72%" height={16} />
          </Box>
        ))}
      </Box>
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
          <Skeleton width={160} height={22} />
        </Box>
        {['first', 'second', 'third', 'fourth'].map((row) => (
          <Box
            key={row}
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '48px minmax(0, 1fr) 64px',
                md: '48px minmax(0, 1fr) 90px 80px 90px 100px',
              },
              alignItems: 'center',
              gap: 2,
              p: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Skeleton variant="rounded" width={48} height={48} />
            <Box>
              <Skeleton width="75%" height={18} sx={{ mb: 1 }} />
              <Skeleton width="45%" height={14} />
            </Box>
            <Skeleton width="80%" height={18} />
            {['price', 'quantity', 'total'].map((column) => (
              <Skeleton
                key={column}
                width="80%"
                height={18}
                sx={{ display: { xs: 'none', md: 'block' } }}
              />
            ))}
          </Box>
        ))}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, gap: 3 }}>
          <Skeleton width={100} height={24} />
          <Skeleton width={100} height={24} />
        </Box>
      </Box>
    </Box>
  );
}
