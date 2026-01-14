import { formatNumber } from "$modules/shared/utils/formatNumber";
import { LinkType } from "$modules/links/types/link/linkType";
import type { ForecastAssetAndFee } from "$modules/shared/types/feeService";

export type DisplayAmountsResult = {
  amounts: Map<string, string>;
  usdAmounts: Map<string, string>;
};

/**
 * Calculate display amounts for assets in link preview
 * For AIRDROP links with maxUse > 1, multiplies amounts by maxUse
 * @param assets - Array of assets to calculate display amounts for
 * @param linkType - Type of the link (AIRDROP, TIP, etc.)
 * @param maxUse - Maximum number of uses for the link
 * @returns Object containing Maps of amounts and USD amounts keyed by asset address
 */
export function calculateDisplayAmounts(
  assets: Array<{ asset: ForecastAssetAndFee["asset"] }>,
  linkType: string | undefined,
  maxUse: number,
): DisplayAmountsResult {
  const amounts = new Map<string, string>();
  const usdAmounts = new Map<string, string>();

  for (const { asset } of assets) {
    if (linkType === LinkType.AIRDROP && maxUse > 1) {
      // Parse the formatted amount, multiply by maxUse, and format again
      const amountStr = asset.amount.replace(/[^\d.-]/g, "");
      const amountNum = parseFloat(amountStr);
      if (!isNaN(amountNum)) {
        const totalAmount = amountNum * maxUse;
        amounts.set(asset.address, formatNumber(totalAmount));
      } else {
        amounts.set(asset.address, asset.amount);
      }

      // Also multiply USD value by maxUse
      if (asset.usdValueStr) {
        const usdStr = asset.usdValueStr.replace(/[^\d.-]/g, "");
        const usdNum = parseFloat(usdStr);
        if (!isNaN(usdNum)) {
          const totalUsd = usdNum * maxUse;
          usdAmounts.set(asset.address, totalUsd.toString());
        } else {
          usdAmounts.set(asset.address, asset.usdValueStr);
        }
      }
    } else {
      amounts.set(asset.address, asset.amount);
      if (asset.usdValueStr) {
        usdAmounts.set(asset.address, asset.usdValueStr);
      }
    }
  }

  return { amounts, usdAmounts };
}
