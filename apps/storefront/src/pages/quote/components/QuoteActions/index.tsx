import { useRef, useState } from 'react';
import { ShoppingCartCheckout } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';

import { useMobile } from '@/hooks/useMobile';
import { useB3Lang } from '@/lib/lang';
import type { QuoteShippingTerms, ShippingAddress } from '@/types/quotes';
import { snackbar } from '@/utils/b3Tip';

import ConvertToOrderDialog from '../ConvertToOrderDialog';
import QuoteDownloadButton from '../QuoteDownloadButton';

interface QuoteAction {
  onClick: () => void;
  disabled?: boolean;
}

interface ConversionDetails {
  companyId: number;
  address: ShippingAddress;
  total: number;
  currencyCode: string;
}

interface Props {
  busy: boolean;
  actions: {
    download: QuoteAction;
    requestOffer?: QuoteAction;
    convertToOrder?: {
      getDetails: () => ConversionDetails;
      // Keep the confirmation open when validation or conversion fails.
      onConfirm: (terms: QuoteShippingTerms) => Promise<boolean>;
      disabled?: boolean;
    };
    print?: QuoteAction;
    sentAtLabel?: string;
  };
}

export default function QuoteActions({ busy, actions }: Props) {
  const b3Lang = useB3Lang();
  const [isMobile] = useMobile();
  const [conversionDetails, setConversionDetails] = useState<ConversionDetails | null>(null);
  const [confirming, setConfirming] = useState(false);
  const conversionInProgress = useRef(false);
  const confirmConversion = async (terms: QuoteShippingTerms) => {
    if (!actions.convertToOrder || conversionInProgress.current || busy) return;
    conversionInProgress.current = true;
    setConfirming(true);
    try {
      const converted = await actions.convertToOrder.onConfirm(terms);
      if (converted) setConversionDetails(null);
    } catch {
      snackbar.error(b3Lang('quoteDetail.convertToOrder.error'));
    } finally {
      conversionInProgress.current = false;
      setConfirming(false);
    }
  };

  return (
    <>
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
            onClick={() => {
              if (actions.convertToOrder) setConversionDetails(actions.convertToOrder.getDetails());
            }}
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
      {conversionDetails && (
        <ConvertToOrderDialog
          companyId={conversionDetails.companyId}
          address={conversionDetails.address}
          total={conversionDetails.total}
          currencyCode={conversionDetails.currencyCode}
          busy={busy || confirming}
          onClose={() => setConversionDetails(null)}
          onConfirm={confirmConversion}
        />
      )}
    </>
  );
}
