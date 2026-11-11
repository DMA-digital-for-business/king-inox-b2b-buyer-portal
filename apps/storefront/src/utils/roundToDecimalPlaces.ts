export const roundToDecimalPlaces = (price: number | string, decimalPlaces: number) => {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return amount;
  // Intl rounds the decimal value (10.075 -> 10.08), unlike binary toFixed.
  return Number(
    new Intl.NumberFormat('en-US', {
      useGrouping: false,
      maximumFractionDigits: decimalPlaces,
    }).format(amount),
  );
};
