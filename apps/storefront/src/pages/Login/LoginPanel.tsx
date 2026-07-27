import { Link } from 'react-router-dom';
import { Box, Button, Link as MuiLink, Typography, useTheme } from '@mui/material';

import { useMobile } from '@/hooks/useMobile';

import LoginWidget from './component/LoginWidget';

interface LoginPanelProps {
  widgetBodyText: string;
  createAccountButtonText: string;
  joinCompanyPrompt: string;
  joinCompanyLinkText: string;
}

function LoginPanel(props: LoginPanelProps) {
  const { widgetBodyText, createAccountButtonText, joinCompanyPrompt, joinCompanyLinkText } = props;

  const theme = useTheme();
  const [isMobile] = useMobile();

  return (
    <Box
      sx={{
        padding: isMobile ? '16px' : '20px',
        borderRadius: '4px',
        mt: isMobile ? '0' : '-25px',
      }}
    >
      <LoginWidget
        sx={{
          // minHeight: '250px',
          '& .panel': {
            '.panel-title': {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              fontWeight: 400,
              fontSize: '24px',
            },
          },
        }}
        html={widgetBodyText}
      />
      <Box
        sx={{
          marginTop: '5px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: 2,
        }}
      >
        <Button
          component={Link}
          to="/register"
          variant="contained"
          sx={{
            ml: isMobile ? 0 : 1,
            backgroundColor: theme.palette.primary.main,
            flexShrink: 0,
          }}
        >
          {createAccountButtonText}
        </Button>
        <Typography variant="body2">
          {joinCompanyPrompt}{' '}
          <MuiLink component={Link} color="#000000" to="/join-company" fontWeight={600}>
            {joinCompanyLinkText}
          </MuiLink>
        </Typography>
      </Box>
    </Box>
  );
}

export default LoginPanel;
