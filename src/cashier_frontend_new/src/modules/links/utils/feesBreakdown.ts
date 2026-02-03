import { parseBalanceUnits } from "$modules/shared/utils/converter";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import type { Result } from "ts-results-es";
import { getTokenLogo } from "$modules/imageCache";
import {
  formatNumber,
  formatUsdAmount,
} from "$modules/shared/utils/formatNumber";
import { feeService } from "$modules/shared/services/feeService";
import {
  calculateIntentFees,
  IntentParticipants,
  TokenStandard,
} from "$shared";
import { ICP_LEDGER_FEE } from "$modules/token/constants";

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
 * Calculate fees breakdown for link creation/preview using shared package.
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

  // Calculate network fees for each asset using shared package
  for (const assetAddress of assetAddresses) {
    if (!assetAddress) continue;

    const tokenResult = findTokenByAddress(assetAddress);
    if (tokenResult.isErr()) continue;

    const token = tokenResult.unwrap();
    
    // Use shared package to calculate network fee for CreatorToLink
    // (which represents funding a link with maxUse)
    const feeResult = calculateIntentFees({
      intent_participants: IntentParticipants.CreatorToLink,
      token_standard: TokenStandard.ICRC1, // Default to ICRC1
      user_input_amount: 0n, // We only care about network fee
      max_use: maxUseNum,
      asset_network_fee: token.fee,
    });
    
    const networkFee = BigInt(feeResult.intent_total_network_fee);
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

  // Add link creation fee (always in ICP) using shared package
  const linkCreationFeeInfo = feeService.getLinkCreationFee();
  const icpTokenResult = findTokenByAddress(linkCreationFeeInfo.tokenAddress);
  if (icpTokenResult.isOk()) {
    const icpToken = icpTokenResult.unwrap();
    
    // Calculate link creation fee using shared package
    // Use ICP_LEDGER_FEE constant to ensure consistency
    const linkCreationResult = calculateIntentFees({
      intent_participants: IntentParticipants.CreatorToTreasury,
      token_standard: TokenStandard.ICRC1, // ICP is ICRC1
      link_creation_fee: linkCreationFeeInfo.amount,
      asset_network_fee: ICP_LEDGER_FEE,
    });
    
    const totalCreationFee = BigInt(linkCreationResult.intent_user_fee);
    const creationFeeAmount = parseBalanceUnits(
      totalCreationFee,
      icpToken.decimals,
    );
    const creationFeeUsd = icpToken.priceUSD
      ? creationFeeAmount * icpToken.priceUSD
      : 0;

    breakdown.push({
      name: "Link creation fee",
      amount: totalCreationFee,
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
