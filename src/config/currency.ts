/**
 * Centralized Global Currency Configuration for TK333
 * Bangladeshi Taka (BDT / ৳) ONLY
 */

export const CURRENCY_CONFIG = {
  code: 'BDT' as const,
  symbol: '৳' as const,
  name: 'Bangladeshi Taka' as const,
  locale: 'en-US' as const,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
} as const;

export const CURRENCY_CODE = CURRENCY_CONFIG.code;
export const CURRENCY_SYMBOL = CURRENCY_CONFIG.symbol;
export const CURRENCY_NAME = CURRENCY_CONFIG.name;

/**
 * Format a number as standardized BDT currency string
 * e.g., 500 -> "৳500", 1250.5 -> "৳1,250.50"
 */
export function formatBDT(amount: number | string | null | undefined, showDecimals = false): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return `${CURRENCY_SYMBOL}0`;

  if (showDecimals || (num % 1 !== 0)) {
    return `${CURRENCY_SYMBOL}${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  return `${CURRENCY_SYMBOL}${Math.floor(num).toLocaleString('en-US')}`;
}

/**
 * Format currency with flexible options
 */
export function formatCurrency(amount: number | string | null | undefined, options?: { showCode?: boolean, showDecimals?: boolean }): string {
  const formatted = formatBDT(amount, options?.showDecimals);
  if (options?.showCode) {
    return `${formatted} ${CURRENCY_CODE}`;
  }
  return formatted;
}

export default CURRENCY_CONFIG;
