import { ComponentProps, ReactNode, useContext } from 'react';
import { ArrowBackIosNew, ShoppingCartCheckout } from '@mui/icons-material';
import { Box, Button, Grid, Typography } from '@mui/material';

import { b3HexToRgb, getContrastColor } from '@/components/outSideComponents/utils/b3CustomStyles';
import { useMobile } from '@/hooks/useMobile';
import { useB3Lang } from '@/lib/lang';
import QuoteDownloadButton from '@/pages/quote/components/QuoteDownloadButton';
import QuoteInfo from '@/pages/quote/components/QuoteInfo';
import QuoteLoading from '@/pages/quote/components/QuoteLoading';
import QuoteStatus from '@/pages/quote/components/QuoteStatus';
import { CustomStyleContext } from '@/shared/customStyleButton';
import { displayFormat } from '@/utils/b3DateFormat';

interface QuoteAction {
  onClick: () => void;
  disabled?: boolean;
}

interface QuotePageProps {
  busy: boolean;
  loadingLabel?: string;
  status: string;
  quoteNumber?: string;
  issuedAt?: number;
  expiredAt?: number;
  salesRepInfo?: { salesRepName?: string; salesRepEmail?: string };
  back?: { label: string; onClick: () => void };
  actions?: {
    download: QuoteAction;
    requestOffer?: QuoteAction;
    convertToOrder?: QuoteAction;
    print?: QuoteAction;
    sentAtLabel?: string;
  };
  information: ComponentProps<typeof QuoteInfo>;
  editingInformation?: ReactNode;
  children: ReactNode;
  dialog?: ReactNode;
}

export default function QuotePage({
  busy,
  loadingLabel,
  status,
  quoteNumber,
  issuedAt,
  expiredAt,
  salesRepInfo,
  back,
  actions,
  information,
  editingInformation,
  children,
  dialog,
}: QuotePageProps) {
  const [isMobile] = useMobile();
  const b3Lang = useB3Lang();
  const {
    state: {
      portalStyle: { backgroundColor = '#FEF9F5' },
    },
  } = useContext(CustomStyleContext);
  const customColor = getContrastColor(backgroundColor);

  return (
    <QuoteLoading busy={busy} loadingLabel={loadingLabel}>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', mb: '60px' }}>
        {back && (
          <Button
            variant="text"
            onClick={back.onClick}
            startIcon={<ArrowBackIosNew sx={{ fontSize: '12px !important' }} />}
            sx={{ mb: '10px', alignSelf: 'flex-start', displayPrint: 'none', p: 0 }}
          >
            {back.label}
          </Button>
        )}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4} sx={{ color: customColor }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography
                component="h1"
                sx={{ fontSize: '34px', color: b3HexToRgb(customColor, 0.87) }}
              >
                {b3Lang('quoteDetail.header.documentTitle')}
              </Typography>
              <QuoteStatus code={status} />
            </Box>
            {quoteNumber && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                #{quoteNumber}
              </Typography>
            )}
            {!!issuedAt && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {b3Lang('quoteDetail.header.issuedDate', {
                  date: String(displayFormat(Number(issuedAt))),
                })}
                {!!expiredAt && expiredAt > 0 && (
                  <>
                    {' - '}
                    {b3Lang('quoteDetail.header.expiryDate', {
                      date: String(displayFormat(Number(expiredAt))),
                    })}
                  </>
                )}
              </Typography>
            )}
            {(salesRepInfo?.salesRepName || salesRepInfo?.salesRepEmail) && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Typography variant="subtitle2" sx={{ fontSize: '16px' }}>
                  {b3Lang('quoteDetail.header.salesRep')}
                </Typography>
                <span>
                  {salesRepInfo.salesRepEmail
                    ? `${salesRepInfo.salesRepName || ''}(${salesRepInfo.salesRepEmail})`
                    : salesRepInfo.salesRepName}
                </span>
              </Box>
            )}
          </Grid>
          {actions && (
            <Grid item xs={12} md={8} sx={{ displayPrint: 'none' }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  justifyContent: isMobile ? 'flex-start' : 'flex-end',
                  '& .MuiButton-root': { whiteSpace: 'nowrap', minHeight: '44px' },
                }}
              >
                <QuoteDownloadButton
                  disabled={busy || !!actions.download.disabled}
                  onClick={actions.download.onClick}
                />
                {actions.requestOffer && (
                  <Button
                    variant="contained"
                    disabled={busy || actions.requestOffer.disabled}
                    onClick={actions.requestOffer.onClick}
                  >
                    {b3Lang('quoteDetail.requestOffer')}
                  </Button>
                )}
                {actions.convertToOrder && (
                  <Button
                    variant="contained"
                    disabled={busy || actions.convertToOrder.disabled}
                    startIcon={<ShoppingCartCheckout />}
                    sx={{
                      backgroundColor: '#15803d',
                      color: '#ffffff',
                      '&:hover': { backgroundColor: '#166534' },
                    }}
                    onClick={actions.convertToOrder.onClick}
                  >
                    {b3Lang('quoteDetail.convertToOrder')}
                  </Button>
                )}
                {actions.print && (
                  <Button
                    variant="contained"
                    disabled={busy || actions.print.disabled}
                    onClick={actions.print.onClick}
                  >
                    {b3Lang('quoteDetail.header.print')}
                  </Button>
                )}
              </Box>
              {actions.sentAtLabel && (
                <Typography variant="body2" sx={{ mt: 1, textAlign: isMobile ? 'left' : 'right' }}>
                  {actions.sentAtLabel}
                </Typography>
              )}
            </Grid>
          )}
        </Grid>
        <Box sx={{ mt: 1 }}>
          {editingInformation ?? (
            <QuoteInfo
              contactInfo={information.contactInfo}
              quoteAndExtraFieldsInfo={information.quoteAndExtraFieldsInfo}
              shippingAddress={information.shippingAddress}
              billingAddress={information.billingAddress}
              status={information.status}
              showQuoteInfoColumn={information.showQuoteInfoColumn}
              handleEditInfoClick={information.handleEditInfoClick}
            />
          )}
        </Box>
        {children}
      </Box>
      {dialog}
    </QuoteLoading>
  );
}
