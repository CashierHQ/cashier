import { parseBalanceUnits } from "$modules/shared/utils/converter";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import type { Result } from "ts-results-es";
import { getTokenLogo } from "$modules/imageCache";
import {
  formatNumber,
  formatUsdAmount,
} from "$modules/shared/utils/formatNumber";
import { feeService } from "$modules/shared/services/feeService";

export type FeeBreakdownItem = {
  name: string;
  amount: bigint;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  usdAmount: number;
};

type FindTokenByAddress = (
  address: string,
) => Result<TokenWithPriceAndBalance, Error>;

/**
 * Calculate fees breakdown for link creation/preview
 * @param assetAddresses - Array of asset addresses
 * @param maxUse - Maximum number of uses for the link
 * @param findTokenByAddress - Function to find token by address
 * @returns Array of fee breakdown items
 */
export function calculateFeesBreakdown(
  assetAddresses: string[],
  maxUse: number,
  findTokenByAddress: FindTokenByAddress,
): FeeBreakdownItem[] {
  const breakdown: FeeBreakdownItem[] = [];
  const maxUseNum = maxUse || 1;

  // Calculate network fees for each asset
  for (const assetAddress of assetAddresses) {
    if (!assetAddress) continue;

    const tokenResult = findTokenByAddress(assetAddress);
    if (tokenResult.isErr()) continue;

    const token = tokenResult.unwrap();
    // Network fee = token.fee * maxUse (one fee per use)
    const networkFee = token.fee * BigInt(maxUseNum);
    const networkFeeAmount = parseBalanceUnits(networkFee, token.decimals);
    const usdValue = token.priceUSD ? networkFeeAmount * token.priceUSD : 0;

    breakdown.push({
      name: "Network fees",
      amount: networkFee,
      tokenAddress: assetAddress,
      tokenSymbol: token.symbol,
      tokenDecimals: token.decimals,
      usdAmount: usdValue,
    });
  }

  // Add link creation fee (always in ICP)
  const linkCreationFeeInfo = feeService.getLinkCreationFee();
  const icpTokenResult = findTokenByAddress(linkCreationFeeInfo.tokenAddress);
  if (icpTokenResult.isOk()) {
    const icpToken = icpTokenResult.unwrap();
    const creationFeeAmount = parseBalanceUnits(
      linkCreationFeeInfo.amount,
      icpToken.decimals,
    );
    const creationFeeUsd = icpToken.priceUSD
      ? creationFeeAmount * icpToken.priceUSD
      : 0;

    breakdown.push({
      name: "Link creation fee",
      amount: linkCreationFeeInfo.amount,
      tokenAddress: linkCreationFeeInfo.tokenAddress,
      tokenSymbol: icpToken.symbol,
      tokenDecimals: icpToken.decimals,
      usdAmount: creationFeeUsd,
    });
  }

  return breakdown;
}

/**
 * Calculate total fees in USD from breakdown
 * @param feesBreakdown - Array of fee breakdown items
 * @returns Total fees in USD
 */
export function calculateTotalFeesUsd(
  feesBreakdown: FeeBreakdownItem[],
): number {
  return feesBreakdown.reduce((total, fee) => total + fee.usdAmount, 0);
}

/**
 * Get link creation fee from breakdown
 * @param feesBreakdown - Array of fee breakdown items
 * @returns Link creation fee item or undefined
 */
export function getLinkCreationFeeFromBreakdown(
  feesBreakdown: FeeBreakdownItem[],
): FeeBreakdownItem | undefined {
  return feesBreakdown.find((fee) => fee.name === "Link creation fee");
}

export type AssetWithTokenInfo = {
  address: string;
  amount: number;
  token: {
    symbol: string;
    decimals: number;
    priceUSD?: number;
  };
  usdValue: number;
  logo: string;
};

/**
 * Convert array of asset addresses and amounts to assetsWithTokenInfo format
 * @param assets - Array of objects with address and amount (in smallest units)
 * @param findTokenByAddress - Function to find token by address
 * @returns Array of assets with token info
 */
export function calculateAssetsWithTokenInfo(
  assets: Array<{ address: string; amount: bigint }>,
  findTokenByAddress: FindTokenByAddress,
): AssetWithTokenInfo[] {
  const result: AssetWithTokenInfo[] = [];

  for (const asset of assets) {
    if (!asset.address) continue;

    const tokenResult = findTokenByAddress(asset.address);
    if (tokenResult.isErr()) continue;

    const token = tokenResult.unwrap();
    const amount = parseBalanceUnits(asset.amount, token.decimals);
    const usdValue = token.priceUSD ? amount * token.priceUSD : 0;

    result.push({
      address: asset.address,
      amount,
      token: {
        symbol: token.symbol,
        decimals: token.decimals,
        priceUSD: token.priceUSD,
      },
      usdValue,
      logo: getTokenLogo(asset.address),
    });
  }

  return result;
}

export type FeeBreakdownItemView = FeeBreakdownItem & {
  tokenLogo: string;
  // amount for showing in UI derived from amount and tokenDecimals (eg: 1_000_000 with decimals=6 -> 1.0)
  feeAmount: number;
  // string representation of feeAmount formatted for display (eg: 1e-7 -> "0.0(7)1")
  feeAmountFormatted: string;
  usdFormatted: string;
};

/**
 * Format fee breakdown item for display
 * @param fee - Fee breakdown item
 * @returns Formatted fee breakdown item view
 */
export function formatFeeBreakdownItem(
  fee: FeeBreakdownItem,
): FeeBreakdownItemView {
  const feeAmount = parseBalanceUnits(fee.amount, fee.tokenDecimals);

  return {
    ...fee,
    tokenLogo: getTokenLogo(fee.tokenAddress),
    feeAmount,
    feeAmountFormatted: formatNumber(feeAmount),
    usdFormatted: formatUsdAmount(fee.usdAmount),
  };
}

/**
 * Format link creation fee for display (returns null if fee is undefined)
 * @param fee - Link creation fee item or undefined
 * @returns Formatted fee view or null
 */
export function formatLinkCreationFeeView(
  fee: FeeBreakdownItem | undefined,
): FeeBreakdownItemView | null {
  if (!fee) return null;
  return formatFeeBreakdownItem(fee);
}
