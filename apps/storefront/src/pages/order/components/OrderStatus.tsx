import { B3Tag } from '@/components/B3Tag';

import getOrderStatus from '../shared/getOrderStatus';

interface OrderStatusProps {
  code: string;
  text?: string;
}

export default function OrderStatus(props: OrderStatusProps) {
  const { code, text } = props;

  const status = getOrderStatus(code);

  return status.name ? (
    <B3Tag
      color={status.color}
      textColor={status.textColor}
      aria-hidden="true"
      style={{ display: 'none' }}
    >
      {text || status.name}
    </B3Tag>
  ) : null;
}
