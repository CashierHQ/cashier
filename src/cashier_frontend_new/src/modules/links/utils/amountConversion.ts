import { formatUsdAmount } from "$modules/shared/utils/formatNumber";

/**
 * Convert USD amount to token amount
 * @param usdAmount - USD amount as number or string
 * @param priceUsd - Token price in USD
 * @returns Token amount as string, or empty string if conversion is not possible
 */
export function convertUsdToToken(
  usdAmount: number | string,
  priceUsd?: number,
): string {
  if (!priceUsd || priceUsd <= 0) return "";
  const usdNum =
    typeof usdAmount === "string" ? parseFloat(usdAmount) : usdAmount;
  if (isNaN(usdNum) || usdNum <= 0) return "";
  const tokenValue = usdNum / priceUsd;
  return tokenValue.toString();
}

/**
 * Convert token amount to USD amount
 * @param tokenAmount - Token amount as number or string
 * @param priceUsd - Token price in USD
 * @returns Formatted USD amount string, or empty string if conversion is not possible
 */
export function convertTokenToUsd(
  tokenAmount: number | string,
  priceUsd?: number,
): string {
  if (!priceUsd || priceUsd <= 0) return "";
  const tokenNum =
    typeof tokenAmount === "string" ? parseFloat(tokenAmount) : tokenAmount;
  if (isNaN(tokenNum) || tokenNum <= 0) return "";
  const usdValue = tokenNum * priceUsd;
  // Round to 4 decimal places to avoid floating point precision errors
  const roundedUsdValue = Math.round(usdValue * 10000) / 10000;
  return formatUsdAmount(roundedUsdValue);
}

/**
 * Parse token amount string to number
 * @param tokenAmountStr - Token amount as string
 * @returns Parsed number, or 0 if invalid
 */
export function parseTokenAmount(tokenAmountStr: string): number {
  if (!tokenAmountStr) return 0;
  const num = parseFloat(tokenAmountStr);
  return isNaN(num) || num <= 0 ? 0 : num;
}
