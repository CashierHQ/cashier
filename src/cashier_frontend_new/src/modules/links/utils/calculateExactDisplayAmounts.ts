// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { parseBalanceUnits } from "$modules/shared/utils/converter";
import { formatNumber } from "$modules/shared/utils/formatNumber";
import type { CreateLinkAsset } from "$modules/creationLink/types/createLinkData";
import type { ForecastAssetAndFee } from "$modules/shared/types/feeService";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import { LinkType } from "$modules/links/types/link/linkType";
import { calculateTotalAssetAmount } from "$modules/links/utils/amountCalculator";

export type ExactDisplayAmountsParams = {
  assetsToDisplay: Array<{ asset: ForecastAssetAndFee["asset"] }>;
  linkAssets: CreateLinkAsset[];
  linkType: string | undefined;
  maxUse: number;
  walletTokens: TokenWithPriceAndBalance[] | undefined;
};

export type ExactDisplayAmountsResult = {
  amounts: Map<string, string>;
  usdAmounts: Map<string, string>;
};

/**
 * Calculate display amounts using exact values from useAmount * maxUse
 * This avoids floating point precision errors by using bigint arithmetic
 * @param params - Parameters for calculation
 * @returns Object containing Maps of amounts and USD amounts keyed by asset address
 */
export function calculateExactDisplayAmounts(
  params: ExactDisplayAmountsParams,
): ExactDisplayAmountsResult {
  const { assetsToDisplay, linkAssets, linkType, maxUse, walletTokens } =
    params;

  const amounts = new Map<string, string>();
  const usdAmounts = new Map<string, string>();

  // For AIRDROP links with maxUse > 1, use exact values from validationService.totalAssetAmount
  if (linkType === LinkType.AIRDROP && maxUse > 1) {
    // Get total amounts using validationService logic (useAmount * maxUse)
    const totalAmountsResult = calculateTotalAssetAmount(linkAssets, maxUse);
    const totalAmounts = totalAmountsResult.isOk()
      ? totalAmountsResult.unwrap()
      : null;

    for (const { asset } of assetsToDisplay) {
      const linkAsset = linkAssets.find((a) => a.address === asset.address);

      if (linkAsset && totalAmounts) {
        // Get total amount from validationService calculation (useAmount * maxUse)
        const totalAmountBigInt = totalAmounts[asset.address];

        if (totalAmountBigInt === undefined) {
          // Fallback to original values if not found
          amounts.set(asset.address, asset.amount);
          if (asset.usdValueStr) {
            usdAmounts.set(asset.address, asset.usdValueStr);
          }
          continue;
        }

        // Get token decimals
        const token = walletTokens?.find((t) => t.address === asset.address);
        const decimals = token?.decimals || 8;

        // Convert to number and format
        const totalAmount = parseBalanceUnits(totalAmountBigInt, decimals);
        amounts.set(asset.address, formatNumber(totalAmount, { tofixed: 8 }));

        // Calculate USD value if available
        // Use exact token amount * priceUSD to avoid floating point precision errors
        if (token?.priceUSD) {
          // Calculate USD from exact token amount (totalAmountBigInt) and price
          const totalAmount = parseBalanceUnits(totalAmountBigInt, decimals);
          const totalUsd = totalAmount * token.priceUSD;

          // Round to 4 decimal places to avoid floating point errors, then format
          const roundedUsd = Math.round(totalUsd * 10000) / 10000;
          usdAmounts.set(asset.address, roundedUsd.toString());
        } else if (asset.usdValueStr) {
          // Fallback to per-use USD * maxUse if priceUSD not available
          const perUseUsd = parseFloat(asset.usdValueStr);
          const totalUsd = perUseUsd * maxUse;
          // Round to 4 decimal places to avoid floating point errors
          const roundedUsd = Math.round(totalUsd * 10000) / 10000;
          usdAmounts.set(asset.address, roundedUsd.toString());
        }
      } else {
        // Fallback to original values if asset not found
        amounts.set(asset.address, asset.amount);
        if (asset.usdValueStr) {
          usdAmounts.set(asset.address, asset.usdValueStr);
        }
      }
    }
  } else {
    // For other link types or maxUse <= 1, use original values
    for (const { asset } of assetsToDisplay) {
      amounts.set(asset.address, asset.amount);
      if (asset.usdValueStr) {
        usdAmounts.set(asset.address, asset.usdValueStr);
      }
    }
  }

  return { amounts, usdAmounts };
}
