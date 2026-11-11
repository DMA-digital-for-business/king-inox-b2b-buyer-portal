import { useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';

import { useB3Lang } from '@/lib/lang';
import type { QuoteShippingTerms, ShippingAddress } from '@/types/quotes';

import { loadQuoteShippingTerms } from './shippingTerms';

interface Props {
  companyId: number;
  address: ShippingAddress;
  total: number;
  currencyCode: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (terms: QuoteShippingTerms) => Promise<void>;
}

export default function ConvertToOrderDialog({
  companyId,
  address,
  total,
  currencyCode,
  busy,
  onClose,
  onConfirm,
}: Props) {
  const portalAnchor = useRef<HTMLDivElement>(null);
  const portalContainer = () => portalAnchor.current?.ownerDocument.body ?? null;
  const b3Lang = useB3Lang();
  const { locale } = useIntl();
  const [selection, setSelection] = useState<QuoteShippingTerms | ''>('');
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['quote-conversion-shipping', companyId, address],
    queryFn: () => loadQuoteShippingTerms(companyId, address),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const validTotal = Number.isFinite(total) && total >= 0;
  const qualifyingCents = Math.round(total * 100) + Math.round((data?.ordersTotal ?? 0) * 100);
  const thresholdCents = data?.threshold == null ? null : Math.round(data.threshold * 100);
  const freeShipping = thresholdCents !== null && qualifyingCents >= thresholdCents;
  const terms = freeShipping ? 'porto_franco' : selection;
  const ready = !!data && !isFetching && !isError && validTotal;
  const money = (amount: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode || 'EUR' }).format(
      amount,
    );

  return (
    <>
      <Box ref={portalAnchor} />
      <Dialog
        open
        container={portalContainer}
        onClose={busy ? undefined : onClose}
        fullWidth
        maxWidth="sm"
        aria-labelledby="quote-conversion-title"
      >
        <DialogTitle id="quote-conversion-title">
          {b3Lang('quoteDetail.conversion.title')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography>{b3Lang('quoteDetail.conversion.message')}</Typography>
            <Typography color="text.secondary">
              {[address?.label, address?.address, address?.city, address?.zipCode]
                .filter(Boolean)
                .join(', ')}
            </Typography>
            {(isFetching || busy) && <LinearProgress aria-label={b3Lang('global.tips.loading')} />}
            {busy && <Typography role="status">{b3Lang('global.tips.loading')}</Typography>}
            {(isError || !validTotal) && (
              <Alert
                severity="error"
                action={
                  isError ? (
                    <Button
                      onClick={() => {
                        refetch();
                      }}
                    >
                      {b3Lang('quoteDetail.conversion.retry')}
                    </Button>
                  ) : undefined
                }
              >
                {b3Lang('quoteDetail.conversion.loadError')}
              </Alert>
            )}
            {ready && data && (
              <>
                {data.description && <Typography>{data.description}</Typography>}
                {data.threshold !== null && (
                  <>
                    <Typography>
                      {b3Lang('quoteDetail.conversion.threshold', {
                        amount: money(data.threshold),
                      })}
                    </Typography>
                    <Typography>
                      {b3Lang('quoteDetail.conversion.orders', { amount: money(data.ordersTotal) })}
                    </Typography>
                    <Alert severity={freeShipping ? 'success' : 'info'}>
                      {freeShipping
                        ? b3Lang('quoteDetail.conversion.freeShipping')
                        : b3Lang('quoteDetail.conversion.remaining', {
                            amount: money(
                              Math.max(0, ((thresholdCents ?? 0) - qualifyingCents) / 100),
                            ),
                          })}
                    </Alert>
                  </>
                )}
                {!freeShipping && (
                  <FormControl fullWidth required disabled={busy}>
                    <InputLabel id="quote-shipping-terms-label">
                      {b3Lang('quoteDetail.conversion.shippingTerms')}
                    </InputLabel>
                    <Select
                      MenuProps={{ container: portalContainer }}
                      labelId="quote-shipping-terms-label"
                      label={b3Lang('quoteDetail.conversion.shippingTerms')}
                      value={selection}
                      onChange={({ target }) => {
                        if (
                          target.value === 'porto_assegnato' ||
                          target.value === 'porto_franco_con_addebito'
                        )
                          setSelection(target.value);
                      }}
                    >
                      <MenuItem value="porto_assegnato">
                        {b3Lang('quoteDetail.conversion.assigned')}
                      </MenuItem>
                      <MenuItem value="porto_franco_con_addebito">
                        {b3Lang('quoteDetail.conversion.charged')}
                      </MenuItem>
                    </Select>
                  </FormControl>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            {b3Lang('global.dialog.cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={!ready || !terms || busy}
            onClick={() => {
              if (ready && terms && !busy) onConfirm(terms);
            }}
          >
            {b3Lang('quoteDetail.conversion.continue')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
