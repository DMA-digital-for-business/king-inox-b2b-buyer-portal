import locales from '@/lib/lang/locales';

export default function getOrderConfirmationUrl(orderId: number, pathname: string): string {
  const [, prefix = ''] = pathname.split('/');
  const [language] = prefix.toLowerCase().split('-');
  const locale = Object.keys(locales).includes(language) ? prefix : 'en';

  return `/${locale}/order-confirmation/?orderId=${orderId}`;
}
