import { ArrowDownward } from '@mui/icons-material';
import { SvgIcon } from '@mui/material';

import CustomButton from '@/components/button/CustomButton';
import { useB3Lang } from '@/lib/lang';

const CTA_BUTTON_COLOR = '#ff7a1a';

interface QuoteDownloadButtonProps {
  disabled: boolean;
  onClick: () => void;
}

export default function QuoteDownloadButton({ disabled, onClick }: QuoteDownloadButtonProps) {
  const b3Lang = useB3Lang();
  return (
    <CustomButton
      variant="outlined"
      disabled={disabled}
      onClick={onClick}
      sx={{
        minHeight: '44px',
        color: CTA_BUTTON_COLOR,
        borderColor: CTA_BUTTON_COLOR,
        backgroundColor: '#ffffff',
        '&:hover': {
          color: CTA_BUTTON_COLOR,
          borderColor: CTA_BUTTON_COLOR,
          backgroundColor: '#ffffff',
        },
        '& .MuiButton-startIcon': {
          marginRight: '8px',
        },
      }}
      startIcon={<ArrowDownward sx={{ fontSize: '16px' }} />}
    >
      {b3Lang('quoteDetail.header.download')}
      <SvgIcon
        titleAccess="PDF"
        viewBox="0 0 20 24"
        sx={{
          ml: 1,
          width: '20px',
          height: '24px',
        }}
      >
        <path
          d="M2.40039 2.4C2.40039 1.07452 3.47491 0 4.80039 0H14.4004L21.6004 7.2V21.6C21.6004 22.9255 20.5259 24 19.2004 24H4.80039C3.47491 24 2.40039 22.9255 2.40039 21.6V2.4Z"
          fill="#ff7a1a"
        />
        <path
          opacity="0.3"
          d="M14.4004 0L21.6004 7.2H16.8004C15.4749 7.2 14.4004 6.12548 14.4004 4.8V0Z"
          fill="white"
        />
        <path
          d="M7.04983 18.8V14.8727H8.59926C8.89713 14.8727 9.1509 14.9296 9.36056 15.0434C9.57022 15.1559 9.73002 15.3125 9.83996 15.5132C9.95118 15.7126 10.0068 15.9427 10.0068 16.2035C10.0068 16.4643 9.95054 16.6944 9.83804 16.8939C9.72554 17.0933 9.56255 17.2486 9.34905 17.3599C9.13683 17.4711 8.87987 17.5267 8.57817 17.5267H7.5906V16.8613H8.44394C8.60374 16.8613 8.73541 16.8338 8.83897 16.7788C8.94379 16.7226 9.02178 16.6452 9.07291 16.5468C9.12533 16.4471 9.15154 16.3327 9.15154 16.2035C9.15154 16.0731 9.12533 15.9594 9.07291 15.8622C9.02178 15.7638 8.94379 15.6877 8.83897 15.634C8.73414 15.579 8.60118 15.5516 8.4401 15.5516H7.88016V18.8H7.04983ZM11.9383 18.8H10.5461V14.8727H11.9498C12.3448 14.8727 12.6849 14.9513 12.97 15.1086C13.2551 15.2645 13.4743 15.4889 13.6277 15.7817C13.7824 16.0744 13.8598 16.4247 13.8598 16.8325C13.8598 17.2416 13.7824 17.5932 13.6277 17.8872C13.4743 18.1812 13.2538 18.4069 12.9661 18.5641C12.6798 18.7214 12.3372 18.8 11.9383 18.8ZM11.3764 18.0886H11.9038C12.1492 18.0886 12.3557 18.0451 12.5232 17.9582C12.6919 17.8699 12.8185 17.7338 12.9029 17.5497C12.9885 17.3643 13.0313 17.1253 13.0313 16.8325C13.0313 16.5423 12.9885 16.3052 12.9029 16.1211C12.8185 15.937 12.6926 15.8015 12.5251 15.7145C12.3576 15.6276 12.1512 15.5841 11.9057 15.5841H11.3764V18.0886ZM14.4748 18.8V14.8727H17.0751V15.5573H15.3052V16.4931H16.9025V17.1777H15.3052V18.8H14.4748Z"
          fill="white"
        />
      </SvgIcon>
    </CustomButton>
  );
}
