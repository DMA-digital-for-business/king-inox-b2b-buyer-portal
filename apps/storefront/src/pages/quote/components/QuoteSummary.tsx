import {
  forwardRef,
  Ref,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';

import ShippingExpectationPrompt from '@/components/ShippingExpectationPrompt';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useIsBackorderEnabled } from '@/hooks/useIsBackorderEnabled';
import { useB3Lang } from '@/lib/lang';
import { useAppSelector } from '@/store';

import getQuoteDraftShowPriceTBD from '../shared/utils';
import { draftQuoteListHasBackorderedItemsForDisplay } from '../utils/getDraftBackorderDisplayFields';

import {
  calculateQuoteSummary,
  emptyQuoteSummary,
  QuoteSummaryData,
} from './calculateQuoteSummary';
import { formatQuotePrice } from './quotePriceFormat';

const QuoteSummary = forwardRef((_, ref: Ref<unknown>) => {
  const b3Lang = useB3Lang();

  const [quoteSummary, setQuoteSummary] = useState<QuoteSummaryData>({
    ...emptyQuoteSummary,
  });

  const [isHideQuoteDraftPrice, setHideQuoteDraftPrice] = useState<boolean>(false);
  const showInclusiveTaxPrice = useAppSelector(({ global }) => global.showInclusiveTaxPrice);
  const draftQuoteList = useAppSelector(({ quoteInfo }) => quoteInfo.draftQuoteList);
  const backorderEnabled = useIsBackorderEnabled();
  const isBackorderMessagingEnabled = useFeatureFlag(
    'BACK-134.backorders_phase_1_1_control_messaging_on_storefront',
  );
  const { showDefaultShippingExpectationPrompt, defaultShippingExpectationPrompt } = useAppSelector(
    ({ global }) => global.backorderDisplaySettings,
  );

  const hasBackorderedItems = useMemo(() => {
    if (!isBackorderMessagingEnabled) {
      return false;
    }
    return draftQuoteListHasBackorderedItemsForDisplay(draftQuoteList);
  }, [draftQuoteList, isBackorderMessagingEnabled]);

  const getSummary = useCallback(() => {
    const isHidePrice = getQuoteDraftShowPriceTBD(draftQuoteList);

    setHideQuoteDraftPrice(isHidePrice);

    setQuoteSummary(calculateQuoteSummary(draftQuoteList, showInclusiveTaxPrice));
  }, [showInclusiveTaxPrice, draftQuoteList]);

  useEffect(() => {
    getSummary();
  }, [getSummary]);

  useImperativeHandle(ref, () => ({
    refreshSummary: () => getSummary(),
  }));

  const priceFormat = (price: number) => formatQuotePrice(price);

  const showPrice = (price: string | number): string | number => {
    if (isHideQuoteDraftPrice) return b3Lang('quoteDraft.quoteSummary.tbd');

    return price;
  };

  const cardId = useId();

  return (
    <Card role="article" aria-labelledby={cardId}>
      <CardContent>
        <Box>
          <Typography id={cardId} variant="h5">
            {b3Lang('quoteDraft.quoteSummary.summary')}
          </Typography>
          <Box
            sx={{
              marginTop: '20px',
              color: '#212121',
            }}
          >
            <Grid
              container
              justifyContent="space-between"
              sx={{
                margin: '4px 0',
              }}
            >
              <Typography id="quote-draft-subtotal">
                {b3Lang('quoteDraft.quoteSummary.subTotal')}
              </Typography>
              <Typography aria-labelledby="quote-draft-subtotal">
                {showPrice(priceFormat(quoteSummary.subtotal))}
              </Typography>
            </Grid>

            <Grid
              container
              justifyContent="space-between"
              sx={{
                margin: '4px 0',
              }}
            >
              <Typography id="quote-draft-shipping">
                {b3Lang('quoteDraft.quoteSummary.shipping')}
              </Typography>
              <Typography aria-labelledby="quote-draft-shipping">
                {b3Lang('quoteDraft.quoteSummary.tbd')}
              </Typography>
            </Grid>

            {isBackorderMessagingEnabled && (
              <ShippingExpectationPrompt
                backorderEnabled={backorderEnabled}
                hasBackorderedItems={hasBackorderedItems}
                showDefaultShippingExpectationPrompt={showDefaultShippingExpectationPrompt}
                defaultShippingExpectationPrompt={defaultShippingExpectationPrompt}
              />
            )}

            <Grid
              container
              justifyContent="space-between"
              sx={{
                margin: '4px 0',
              }}
            >
              <Typography id="quote-draft-tax">{b3Lang('quoteDraft.quoteSummary.tax')}</Typography>
              <Typography aria-labelledby="quote-draft-tax">
                {showPrice(priceFormat(quoteSummary.tax))}
              </Typography>
            </Grid>

            <Grid
              container
              justifyContent="space-between"
              sx={{
                margin: '24px 0 0',
              }}
            >
              <Typography
                id="quote-draft-grand-total"
                sx={{
                  fontWeight: 'bold',
                }}
              >
                {b3Lang('quoteDraft.quoteSummary.grandTotal')}
              </Typography>
              <Typography
                aria-labelledby="quote-draft-grand-total"
                sx={{
                  fontWeight: 'bold',
                }}
              >
                {showPrice(priceFormat(quoteSummary.grandTotal))}
              </Typography>
            </Grid>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
});
export default QuoteSummary;
