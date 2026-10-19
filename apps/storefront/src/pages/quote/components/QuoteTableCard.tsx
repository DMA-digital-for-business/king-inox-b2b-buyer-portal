import { Delete } from '@mui/icons-material';
import { Box, CardContent, TextField, Typography } from '@mui/material';

import BackorderMessage from '@/components/BackorderMessage';
import { useB3Lang } from '@/lib/lang';
import { QuoteItem } from '@/types/quotes';
import { getBCPrice, getDisplayPrice } from '@/utils/b3Product/b3Product';
import { getProductOptionsFields } from '@/utils/b3Product/shared/config';

import {
  draftRowQuantityExceedsAvailableToSell,
  getDraftBackorderDisplayFields,
} from '../utils/getDraftBackorderDisplayFields';

import {
  formatPackagingQuantity,
  getPackagingMetafieldValue,
  packagingColumns,
} from './quotePackaging';
import { formatQuotePrice, formatQuoteUnitPrice } from './quotePriceFormat';
import { isDisambiguationLabel } from './quoteProductOptions';

interface QuoteTableCardProps {
  item: QuoteItem['node'];
  onDelete: (id: string) => void;
  handleUpdateProductQty: (item: QuoteItem['node'], quantity: number) => void;
  handleCheckProductQty: (item: QuoteItem['node'], quantity: number) => void;
  isLast: boolean;
  draftQuoteBackorderContextEnabled: boolean;
  packagingByVariantId?: Record<number, Array<{ entityId: number; key: string; value: string }>>;
  showBackorderDetails?: boolean;
}

function QuoteTableCard({
  item,
  onDelete,
  handleUpdateProductQty,
  handleCheckProductQty,
  isLast,
  draftQuoteBackorderContextEnabled,
  packagingByVariantId,
  showBackorderDetails = false,
}: QuoteTableCardProps) {
  const { basePrice, quantity, id, productName, variantSku, productsSearch, taxPrice = 0 } = item;

  const b3Lang = useB3Lang();
  const backorderFields = getDraftBackorderDisplayFields(item);
  const hideBackorderForStockError = draftRowQuantityExceedsAvailableToSell(item);

  const showBackorderMessage =
    draftQuoteBackorderContextEnabled &&
    Boolean(backorderFields) &&
    !hideBackorderForStockError &&
    showBackorderDetails;

  const price = getBCPrice(Number(basePrice), Number(taxPrice));

  const total = price * Number(quantity);

  const product = {
    ...item.productsSearch,
    selectOptions: item.optionList,
  };

  const productFields = getProductOptionsFields(product, {});

  const optionList = JSON.parse(item.optionList);
  const optionsValue: CustomFieldItems[] = productFields.filter(
    (item) => item.valueText && !isDisambiguationLabel(item.valueLabel),
  );

  const { productUrl } = productsSearch;

  const singlePrice = getDisplayPrice({
    price: formatQuoteUnitPrice(price),
    productInfo: item,
    showText: b3Lang('quoteDraft.quoteSummary.tbd'),
  });

  const totalPrice = getDisplayPrice({
    price: formatQuotePrice(total),
    productInfo: item,
    showText: b3Lang('quoteDraft.quoteSummary.tbd'),
  });

  return (
    <Box
      key={id}
      width="100%"
      sx={{
        borderTop: '1px solid #D9DCE9',
        borderBottom: isLast ? '1px solid #D9DCE9' : '',
      }}
    >
      <CardContent
        sx={{
          color: '#313440',
          display: 'flex',
          pl: 0,
        }}
      >
        <Box
          sx={{
            flex: 1,
          }}
        >
          <Typography
            variant="body1"
            color="#212121"
            onClick={() => {
              if (productUrl) {
                window.location.href = `${window.location.origin}${productUrl}`;
              }
            }}
            sx={{
              cursor: 'pointer',
            }}
          >
            {productName}
          </Typography>
          <Typography variant="body1" color="#616161">
            {variantSku}
          </Typography>
          <Box
            sx={{
              margin: '1rem 0',
            }}
          >
            {optionList.length > 0 && optionsValue.length > 0 && (
              <Box>
                {optionsValue.map((option) => (
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      lineHeight: '1.5',
                      color: '#455A64',
                    }}
                    key={option.valueLabel}
                  >
                    {option.valueLabel}: {option.valueText}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>

          <Typography>
            Misura: {getPackagingMetafieldValue(item, 'MISURA', packagingByVariantId)}
          </Typography>
          <Box sx={{ marginBottom: '1rem' }}>
            {packagingColumns.map((field) => (
              <Typography
                key={field.key}
                sx={{
                  fontSize: '0.75rem',
                  lineHeight: '1.5',
                  color: '#455A64',
                }}
              >
                {field.title}:{' '}
                {formatPackagingQuantity(
                  getPackagingMetafieldValue(item, field.key, packagingByVariantId),
                )}
              </Typography>
            ))}
          </Box>

          <Typography sx={{ fontSize: '14px' }}>Price: {singlePrice}</Typography>

          <>
            <TextField
              size="small"
              type="number"
              variant="filled"
              label="qty"
              inputProps={{
                inputMode: 'numeric',
                pattern: '[0-9]*',
              }}
              value={quantity}
              sx={{
                margin: '1rem 0',
                width: '60%',
                maxWidth: '100px',
                '& label': {
                  fontSize: '14px',
                },
                '& input': {
                  fontSize: '14px',
                },
              }}
              onChange={(e) => {
                handleUpdateProductQty(item, Number(e.target.value));
              }}
              onBlur={(e) => {
                handleCheckProductQty(item, Number(e.target.value));
              }}
            />
            {showBackorderMessage && backorderFields && (
              <Box sx={{ mt: 1.5 }}>
                <BackorderMessage
                  totalOnHand={backorderFields.totalOnHand}
                  quantityBackordered={backorderFields.quantityBackordered}
                  backorderMessage={backorderFields.backorderMessage}
                  visible
                />
              </Box>
            )}
          </>
          <Typography sx={{ fontSize: '14px' }}>Total: {totalPrice}</Typography>
          <Box
            sx={{
              marginTop: '1rem',
              textAlign: 'end',
            }}
            id="shoppingList-actionList-mobile"
          >
            <Delete
              sx={{ cursor: 'pointer', color: 'rgba(0, 0, 0, 0.54)' }}
              onClick={() => {
                onDelete(id);
              }}
            />
          </Box>
        </Box>
      </CardContent>
    </Box>
  );
}

export default QuoteTableCard;
