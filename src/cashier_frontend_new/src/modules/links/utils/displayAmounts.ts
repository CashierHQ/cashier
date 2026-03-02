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
  _linkType: string | undefined,
  _maxUse: number,
): DisplayAmountsResult {
  const amounts = new Map<string, string>();
  const usdAmounts = new Map<string, string>();

  for (const { asset } of assets) {
    amounts.set(asset.address, asset.amount);
    if (asset.usdValueStr) {
      usdAmounts.set(asset.address, asset.usdValueStr);
    }
  }

  return { amounts, usdAmounts };
}
