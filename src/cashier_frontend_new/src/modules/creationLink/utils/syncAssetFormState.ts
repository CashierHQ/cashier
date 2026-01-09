// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { parseBalanceUnits } from "$modules/shared/utils/converter";
import { formatUsdAmount } from "$modules/shared/utils/formatNumber";

export type SyncAssetFormStateParams = {
  assetUseAmount: bigint | undefined;
  decimals: number;
  tokenUsdPrice: number | undefined;
  canConvert: boolean;
  addressChanged: boolean;
  amountChanged: boolean;
  previousUseAmount: bigint | undefined;
  isUsd: boolean;
};

export type SyncAssetFormStateResult = {
  localTokenAmount: string;
  localUsdAmount: string;
  shouldUpdate: boolean;
};

/**
 * Synchronizes form state with asset data, handling token changes and amount updates
 * @param params - Parameters for synchronization
 * @returns Result containing updated local amounts and whether update should occur
 */
export function syncAssetFormState(
  params: SyncAssetFormStateParams,
): SyncAssetFormStateResult {
  const {
    assetUseAmount,
    decimals,
    tokenUsdPrice,
    canConvert,
    addressChanged,
    amountChanged,
    previousUseAmount,
    isUsd,
  } = params;

  // If address changed, clear amounts
  if (addressChanged) {
    return {
      localTokenAmount: "",
      localUsdAmount: "",
      shouldUpdate: true,
    };
  }

  // If no amount or zero amount and address changed, clear
  if (assetUseAmount === 0n && addressChanged) {
    return {
      localTokenAmount: "",
      localUsdAmount: "",
      shouldUpdate: true,
    };
  }

  // If we have a valid amount
  if (assetUseAmount !== undefined && assetUseAmount !== 0n) {
    const tokenAmountNumber = parseBalanceUnits(assetUseAmount, decimals);

    if (tokenAmountNumber > 0) {
      // Only update if we're not in USD mode (to avoid overwriting user input)
      const shouldUpdate =
        addressChanged ||
        amountChanged ||
        (previousUseAmount === undefined && !isUsd);

      if (shouldUpdate) {
        const localTokenAmount = tokenAmountNumber.toString();
        let localUsdAmount = "";

        if (canConvert && tokenUsdPrice) {
          const usdValue = tokenAmountNumber * tokenUsdPrice;
          // Round to 4 decimal places to avoid floating point precision errors
          const roundedUsdValue = Math.round(usdValue * 10000) / 10000;
          localUsdAmount = formatUsdAmount(roundedUsdValue);
        }

        return {
          localTokenAmount,
          localUsdAmount,
          shouldUpdate: true,
        };
      }
    }
  }

  // No update needed
  return {
    localTokenAmount: "",
    localUsdAmount: "",
    shouldUpdate: false,
  };
}
