import { Typography } from '@mui/material';

import B3Dialog from '@/components/B3Dialog';
import { useB3Lang } from '@/lib/lang';

interface QuoteSubmissionResponseProps {
  isOpen: boolean;
  onClose: () => void;
}

function QuoteSubmissionResponse({ isOpen, onClose }: QuoteSubmissionResponseProps) {
  const b3Lang = useB3Lang();

  return (
    <B3Dialog
      isOpen={isOpen}
      title={b3Lang('quoteDraft.submission.response.title')}
      showLeftBtn={false}
      handRightClick={onClose}
      handleLeftClick={onClose}
      isShowBordered={false}
      rightSizeBtn={b3Lang('quoteDraft.submission.response.button.text')}
      maxWidth="sm"
      fullWidth
      restDialogParams={{ fullScreen: false }}
    >
      <Typography sx={{ lineHeight: 1.7, mb: 2 }}>
        {b3Lang('quoteDraft.submission.response.message')}
      </Typography>
      <Typography sx={{ lineHeight: 1.7 }} color="text.secondary">
        {b3Lang('quoteDraft.submission.response.next')}
      </Typography>
    </B3Dialog>
  );
}

export default QuoteSubmissionResponse;
