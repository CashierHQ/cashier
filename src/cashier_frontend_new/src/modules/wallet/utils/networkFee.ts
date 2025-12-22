import { parseBalanceUnits } from "$modules/shared/utils/converter";
import {
  formatNumber,
  formatUsdAmount,
} from "$modules/shared/utils/formatNumber";
import type { TokenWithPriceAndBalance } from "$modules/token/types";

/**
 * Network fee information for display
 */
export interface NetworkFeeInfo {
  amount: number;
  amountFormatted: string;
  symbol: string;
  decimals: number;
  usdValue: number;
  usdValueFormatted: string;
}

/**
 * Calculate network fee information from token
 * ICRC tokens use their own fee, not ICP
 * @param token - Token with price and balance information
 * @returns Network fee information object with formatted values
 */
export function calculateNetworkFeeInfo(
  token: TokenWithPriceAndBalance | null,
): NetworkFeeInfo {
  if (!token) {
    return {
      amount: 0,
      amountFormatted: "0",
      symbol: "",
      decimals: 8,
      usdValue: 0,
      usdValueFormatted: "",
    };
  }

  const feeAmount = parseBalanceUnits(token.fee, token.decimals);
  const feeFormatted = formatNumber(feeAmount, {
    tofixed: token.decimals,
  });
  const usdValue = token.priceUSD ? feeAmount * token.priceUSD : 0;
  const usdValueFormatted = usdValue > 0 ? formatUsdAmount(usdValue) : "";

  return {
    amount: feeAmount,
    amountFormatted: feeFormatted,
    symbol: token.symbol,
    decimals: token.decimals,
    usdValue,
    usdValueFormatted,
  };
}
