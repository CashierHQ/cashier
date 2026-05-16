import { FeeType } from "$modules/links/types/fee";
import type {
  FeeBreakdownItem,
  FindTokenByAddress,
} from "$modules/links/utils/feesBreakdown";
import type { ForecastAssetAndFee } from "$modules/shared/types/feeService";

/**
 * Builds a preview of the fees breakdown for a given set of forecasted assets and fees.
 * @param forecastAssetAndFees - An array of forecasted assets and their associated fees.
 * @param findTokenByAddress - A function to find token details by its address.
 * @returns An array of fee breakdown items.
 */
export function buildPreviewFeesBreakdown(
  forecastAssetAndFees: ForecastAssetAndFee[],
  findTokenByAddress: FindTokenByAddress,
): FeeBreakdownItem[] {
  const breakdown: FeeBreakdownItem[] = [];

  for (const item of forecastAssetAndFees) {
    if (!item.fee) continue;

    const tokenResult = findTokenByAddress(item.asset.address);
    if (tokenResult.isErr()) continue;

    const token = tokenResult.unwrap();

    breakdown.push({
      name:
        item.fee.feeType === FeeType.CREATE_LINK_FEE
          ? "Link creation fee"
          : "Network fee",
      amount: item.fee.amount,
      tokenAddress: item.asset.address,
      tokenSymbol: item.asset.symbol,
      tokenDecimals: token.decimals,
      usdAmount: item.fee.usdValue ?? 0,
    });
  }

  return breakdown;
}
