export const toBengaliNumber = (num: number | string): string => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
};

export const formatBengaliCurrency = (num: number): string => {
  const formatted = num.toLocaleString('en-IN');
  return toBengaliNumber(formatted);
};
