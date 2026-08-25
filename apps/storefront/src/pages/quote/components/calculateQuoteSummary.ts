import { QuoteItem } from '@/types/quotes';
import { getBCPrice } from '@/utils/b3Product/b3Product';

export interface QuoteSummaryData {
  subtotal: number;
  shipping: number;
  tax: number;
  grandTotal: number;
}

export const emptyQuoteSummary: QuoteSummaryData = {
  subtotal: 0,
  shipping: 0,
  tax: 0,
  grandTotal: 0,
};

export function calculateQuoteSummary(
  items: QuoteItem[],
  showInclusiveTaxPrice: boolean,
): QuoteSummaryData {
  return items.reduce((summary, product) => {
    const { basePrice, taxPrice: productTax = 0, quantity } = product.node;
    const price = getBCPrice(Number(basePrice), Number(productTax));
    const subtotal = summary.subtotal + Number(price) * Number(quantity);
    const tax = summary.tax + Number(productTax) * Number(quantity);
    const grandTotal = (showInclusiveTaxPrice ? subtotal : subtotal + tax) + summary.shipping;

    return {
      grandTotal,
      shipping: summary.shipping,
      tax,
      subtotal,
    };
  }, emptyQuoteSummary);
}
