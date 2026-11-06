import { ReactNode, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowBackIosNew } from '@mui/icons-material';
import { Box, Grid, styled, Typography, useTheme } from '@mui/material';

import CustomButton from '@/components/button/CustomButton';
import { b3HexToRgb, getContrastColor } from '@/components/outSideComponents/utils/b3CustomStyles';
import { useMobile } from '@/hooks/useMobile';
import { useB3Lang } from '@/lib/lang';
import { CustomStyleContext } from '@/shared/customStyleButton';
import { displayFormat } from '@/utils/b3DateFormat';

import QuoteDownloadButton from './QuoteDownloadButton';
import QuoteStatus from './QuoteStatus';

const CTA_BUTTON_COLOR = '#ff7a1a';

const StyledCreateName = styled('div')(() => ({
  display: 'flex',
  alignItems: 'center',
  marginTop: '0.5rem',
}));

interface QuoteDetailHeaderProps {
  busy?: boolean;
  status: string;
  quoteNumber: string;
  issuedAt: number;
  expiredAt?: number;
  exportPdf: () => void;
  printQuote: () => Promise<void>;
  sendAction?: ReactNode;
  role: string | number;
  salesRepInfo: { [key: string]: string };
}

function QuoteDetailHeader(props: QuoteDetailHeaderProps) {
  const [isMobile] = useMobile();
  const b3Lang = useB3Lang();

  const {
    busy = false,
    status,
    quoteNumber,
    issuedAt,
    expiredAt,
    exportPdf,
    printQuote,
    sendAction,
    role,
    salesRepInfo,
  } = props;

  const {
    state: {
      portalStyle: { backgroundColor = '#FEF9F5' },
    },
  } = useContext(CustomStyleContext);

  const customColor = getContrastColor(backgroundColor);

  const theme = useTheme();

  const primaryColor = theme.palette.primary.main;

  const navigate = useNavigate();
  const gridOptions = (xs: number) =>
    isMobile
      ? {}
      : {
          xs,
        };

  return (
    <>
      {Number(role) !== 100 && (
        <Box
          sx={{
            marginBottom: '10px',
            width: 'fit-content',
            displayPrint: 'none',
          }}
        >
          <Box
            sx={{
              color: '#0D4372',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={() => {
              navigate('/quotes');
            }}
          >
            <ArrowBackIosNew
              fontSize="small"
              sx={{
                fontSize: '12px',
                marginRight: '0.5rem',
                color: primaryColor,
              }}
            />
            <p
              style={{
                color: primaryColor,
                margin: '0',
              }}
            >
              {b3Lang('quoteDetail.header.backToQuoteLists')}
            </p>
          </Box>
        </Box>
      )}

      <Grid
        container
        spacing={2}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          mb: isMobile ? '16px' : '',
        }}
      >
        <Grid
          item
          {...gridOptions(4)}
          sx={{
            color: customColor,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: isMobile ? 'start' : 'center',
              flexDirection: isMobile ? 'column' : 'row',
            }}
          >
            <Typography
              component="h1"
              sx={{
                marginRight: '10px',
                fontSize: '34px',
                color: b3HexToRgb(customColor, 0.87),
              }}
            >
              {b3Lang('quoteDetail.header.documentTitle')}
            </Typography>

            <QuoteStatus code={status} />
          </Box>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {quoteNumber ? `#${quoteNumber}` : ''}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {b3Lang('quoteDetail.header.issuedDate', {
              date: issuedAt ? String(displayFormat(Number(issuedAt))) : '',
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
          {(salesRepInfo?.salesRepName || salesRepInfo?.salesRepEmail) && (
            <StyledCreateName>
              <Typography
                variant="subtitle2"
                sx={{
                  marginRight: '0.5rem',
                  fontSize: '16px',
                }}
              >
                {b3Lang('quoteDetail.header.salesRep')}
              </Typography>
              <span>
                {salesRepInfo?.salesRepEmail !== ''
                  ? `${salesRepInfo?.salesRepName}(${salesRepInfo?.salesRepEmail})`
                  : salesRepInfo?.salesRepName}
              </span>
            </StyledCreateName>
          )}
        </Grid>
        {Number(role) !== 100 && (
          <Grid
            item
            sx={{
              textAlign: isMobile ? 'none' : 'end',
              displayPrint: 'none',
            }}
            {...gridOptions(8)}
          >
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'flex-start',
                justifyContent: isMobile ? 'flex-start' : 'flex-end',
                flexWrap: 'wrap',
                '& .MuiButton-root': { whiteSpace: 'nowrap', minHeight: '44px' },
              }}
            >
              <QuoteDownloadButton disabled={busy} onClick={exportPdf} />
              {[0, 1].includes(Number(status))
                ? sendAction
                : status !== '' &&
                  !busy && (
                    <CustomButton
                      variant="contained"
                      sx={{
                        displayPrint: 'none',
                        backgroundColor: CTA_BUTTON_COLOR,
                        '&:hover': {
                          backgroundColor: CTA_BUTTON_COLOR,
                        },
                      }}
                      onClick={printQuote}
                    >
                      {b3Lang('quoteDetail.header.print')}
                    </CustomButton>
                  )}
            </Box>
          </Grid>
        )}
      </Grid>
    </>
  );
}

export default QuoteDetailHeader;
