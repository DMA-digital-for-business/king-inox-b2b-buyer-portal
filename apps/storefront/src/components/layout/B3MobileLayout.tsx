import { ReactNode, useContext, useState } from 'react';
import { Close, Dehaze, ShoppingBagOutlined } from '@mui/icons-material';
import { Badge, Box, Drawer, IconButton } from '@mui/material';

import { CART_URL } from '@/constants';
import { useB3Lang } from '@/lib/lang';
import { CustomStyleContext } from '@/shared/customStyleButton';
import { isB2BUserSelector, rolePermissionSelector, useAppSelector } from '@/store';

import CompanyCredit from '../CompanyCredit';
import { getContrastColor } from '../outSideComponents/utils/b3CustomStyles';

import B3AccountInfo from './B3AccountInfo';
import B3CloseAppButton from './B3CloseAppButton';
import B3Logo from './B3Logo';
import B3Nav from './B3Nav';

export default function B3MobileLayout({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const b3Lang = useB3Lang();
  const isB2BUser = useAppSelector(isB2BUserSelector);
  const [isOpenMobileSidebar, setOpenMobileSidebar] = useState<boolean>(false);
  const cartNumber = useAppSelector(({ global }) => global.cartNumber);
  const isAgenting = useAppSelector(({ b2bFeatures }) => b2bFeatures.masqueradeCompany.isAgenting);
  const { purchasabilityPermission } = useAppSelector(rolePermissionSelector);

  const isShowCart = isB2BUser ? purchasabilityPermission : true;

  const {
    state: {
      portalStyle: { backgroundColor = '#FEF9F5' },
    },
  } = useContext(CustomStyleContext);

  const openRouteList = () => {
    setOpenMobileSidebar(true);
  };

  const customColor = getContrastColor(backgroundColor);

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        p: 'clamp(16px, 4vw, 32px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 'clamp(16px, 4.5vw, 32px)',
          gap: 1,
        }}
      >
        <IconButton
          aria-label={b3Lang('global.navigation.openMenu')}
          aria-expanded={isOpenMobileSidebar}
          aria-controls={isOpenMobileSidebar ? 'buyer-portal-navigation' : undefined}
          onClick={openRouteList}
          sx={{ color: customColor }}
        >
          <Dehaze />
        </IconButton>

        <B3Logo />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',

            '& span': {
              marginRight: '1.5rem',
            },
          }}
        >
          {isShowCart && (
            <Badge
              badgeContent={cartNumber}
              max={1000}
              sx={{
                '& .MuiBadge-badge': {
                  color: '#FFFFFF',
                  backgroundColor: '#0D4372',
                  fontWeight: 500,
                  fontSize: '12px',
                  minWidth: '18px',
                  height: '18px',
                  top: '8px',
                  right: '3px',
                  marginRight: '-0.5rem',
                },
              }}
            >
              <ShoppingBagOutlined
                sx={{ color: 'rgba(0, 0, 0, 0.54)', marginRight: '-0.5rem' }}
                onClick={() => {
                  window.location.href = CART_URL;
                }}
              />
            </Badge>
          )}
          <Box
            sx={{
              marginLeft: '2px',
              height: '24px',
            }}
          >
            <B3CloseAppButton />
          </Box>
        </Box>
      </Box>

      <Box
        component="h1"
        sx={{
          p: 0,
          m: 0,
          mb: 'clamp(16px, 6vw, 32px)',
          fontSize: '34px',
          fontWeight: '400',
          color: customColor || '#263238',
        }}
      >
        {title}
      </Box>
      <CompanyCredit />
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          paddingBottom: isAgenting ? '52px' : '0',
        }}
      >
        {children}
      </Box>
      <Drawer
        anchor="left"
        open={isOpenMobileSidebar}
        onClose={() => setOpenMobileSidebar(false)}
        PaperProps={{
          id: 'buyer-portal-navigation',
          sx: {
            width: 'min(360px, 92vw)',
            boxSizing: 'border-box',
            p: 'clamp(16px, 4vw, 24px)',
            overflowY: 'auto',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            pb: 2,
          }}
        >
          <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <B3AccountInfo closeSidebar={setOpenMobileSidebar} />
          </Box>
          <IconButton
            aria-label={b3Lang('global.navigation.closeMenu')}
            onClick={() => setOpenMobileSidebar(false)}
          >
            <Close />
          </IconButton>
        </Box>
        <B3Nav closeSidebar={setOpenMobileSidebar} />
      </Drawer>
    </Box>
  );
}
