import { ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, useMediaQuery } from '@mui/material';

import { useMobile } from '@/hooks/useMobile';
import { useB3Lang } from '@/lib/lang';
import { DynamicallyVariableContext } from '@/shared/dynamicallyVariable';
import { getIsTokenGotoPage, routes } from '@/shared/routes';
import { useAppSelector } from '@/store';

import B3Dialog from '../B3Dialog';
import CompanyCredit from '../CompanyCredit';

import B3CloseAppButton from './B3CloseAppButton';
import B3Logo from './B3Logo';
import B3MainHeader from './B3MainHeader';
import B3MobileLayout from './B3MobileLayout';
import B3Nav from './B3Nav';

const SPECIAL_PATH_TEXTS = {
  '/purchased-products': 'global.purchasedProducts.title',
  '/orders': 'global.orders.title',
  '/company-orders': 'global.companyOrders.title',
} as const;

export default function B3Layout({ children }: { children: ReactNode }) {
  const [isMobile] = useMobile();
  const isCompactLayout = useMediaQuery('(max-width:1023px)');

  const location = useLocation();

  const [title, setTitle] = useState<string>('');

  const b3Lang = useB3Lang();

  const emailAddress = useAppSelector(({ company }) => company.customer.emailAddress);
  const customerId = useAppSelector(({ company }) => company.customer.id);

  const {
    state: { globalMessageDialog },
    dispatch,
  } = useContext(DynamicallyVariableContext);

  const navigate = useNavigate();

  useEffect(() => {
    if ((!emailAddress || !customerId) && !getIsTokenGotoPage(location.pathname)) {
      navigate('/login');
    }
  }, [emailAddress, customerId, location, navigate]);

  useEffect(() => {
    const itemsRoutes = routes.find((item) => item.path === location.pathname);
    if (itemsRoutes && location.pathname !== '/quoteDraft') {
      const foundPath = Object.entries(SPECIAL_PATH_TEXTS).find(
        ([specialPath]) => specialPath === location.pathname,
      );
      if (foundPath) {
        setTitle(b3Lang(foundPath[1]));
      } else {
        setTitle(b3Lang(itemsRoutes.idLang));
      }
    } else {
      setTitle('');
    }
    dispatch({
      type: 'common',
      payload: {
        tipMessage: {
          msgs: [],
        },
      },
    });
    // disabling as dispatch is not necessary in the deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const messageDialogClose = () => {
    dispatch({
      type: 'common',
      payload: {
        globalMessageDialog: {
          open: false,
          title: '',
          message: '',
          cancelText: 'Cancel',
        },
      },
    });
  };

  const overflowStyle = useMemo(() => {
    const overflowXHiddenPage = ['/invoice', '/documents', '/quotes', '/company-orders', '/orders'];
    if (overflowXHiddenPage.includes(location.pathname)) {
      return {
        overflowX: 'hidden',
      };
    }

    return {};
  }, [location]);

  return (
    <Box>
      {isCompactLayout ? (
        <B3MobileLayout title={title}>{children}</B3MobileLayout>
      ) : (
        <Box
          id="app-mainPage-layout"
          sx={{
            display: 'flex',
            minHeight: '100vh',
            margin: 'auto',
            width: '100%',
            maxWidth: 1775,
            boxSizing: 'border-box',
            flexDirection: 'row',
            p: { xs: '24px 24px 48px', lg: '32px 40px 70px', xl: '32px 63px 70px' },
          }}
        >
          <B3CloseAppButton />
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '200px',
              flexShrink: 0,
              position: 'sticky',
              top: '32px',
              alignSelf: 'flex-start',
              maxHeight: 'calc(100dvh - 64px)',
              overflowY: 'auto',
              displayPrint: 'none',
            }}
          >
            <B3Logo />
            <Box
              sx={{
                pt: '24px',
              }}
            >
              <B3Nav />
            </Box>
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              maxWidth: '1450px',
              width: '100%',
              pl: { xs: '24px', lg: '32px', xl: '50px' },
              ...overflowStyle,
            }}
          >
            <B3MainHeader title={title} />
            <CompanyCredit />
            <Box
              component="main"
              sx={{
                mt: !isMobile && !title ? '24px' : '0',
                backgroundColor: '#EEEFF2',
                p: '8px',
                borderRadius: '8px',
              }}
            >
              {children}
            </Box>
          </Box>
        </Box>
      )}

      <B3Dialog
        isOpen={globalMessageDialog.open}
        title={globalMessageDialog.title}
        leftSizeBtn={globalMessageDialog.cancelText}
        rightSizeBtn={globalMessageDialog.saveText}
        handleLeftClick={globalMessageDialog.cancelFn || messageDialogClose}
        handRightClick={globalMessageDialog.saveFn}
        showRightBtn={!!globalMessageDialog.saveText}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: isMobile ? 'center' : 'start',
            width: isMobile ? '100%' : '450px',
            height: '100%',
          }}
        >
          {globalMessageDialog.message}
        </Box>
      </B3Dialog>
    </Box>
  );
}
