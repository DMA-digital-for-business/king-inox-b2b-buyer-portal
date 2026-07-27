import { useIntl } from 'react-intl';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Link, Typography } from '@mui/material';

import { B3Card } from '@/components/B3Card';
import { useB3Lang } from '@/lib/lang';

import { type PageProps } from '../PageProps';

import { getJoinCompanyFormId } from './config';
import { HubSpotForm } from './HubSpotForm';

function JoinCompany({ setOpenPage }: PageProps) {
  const b3Lang = useB3Lang();
  const { locale } = useIntl();

  return (
    <B3Card setOpenPage={setOpenPage}>
      <Box
        sx={{
          bgcolor: '#FFFFFF',
          borderRadius: '4px',
          margin: '40px auto',
          maxWidth: 720,
          padding: { xs: 2, sm: 4 },
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom>
          {b3Lang('joinCompany.title')}
        </Typography>
        <Typography sx={{ mb: 3 }}>{b3Lang('joinCompany.intro')}</Typography>

        <HubSpotForm
          formId={getJoinCompanyFormId(locale)}
          unavailableMessage={b3Lang('joinCompany.formUnavailable')}
        />

        <Link component={RouterLink} to="/login" sx={{ display: 'inline-block', mt: 3 }}>
          {b3Lang('joinCompany.backToLogin')}
        </Link>
      </Box>
    </B3Card>
  );
}

export default JoinCompany;
