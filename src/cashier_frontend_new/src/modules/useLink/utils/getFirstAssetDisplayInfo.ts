import type { AssetInfo } from "$modules/links/types/link/asset";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import type { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import { parseBalanceUnits } from "$modules/shared/utils/converter";

export interface FirstAssetDisplayInfo {
  tokenAddress: string;
  symbol: string;
  amount: number; // Changed to number for proper formatting
  decimals: number;
}

/**
 * Get display information (address, symbol, amount) for the first asset from asset_info.
 * This utility is used to avoid code duplication across components.
 *
 * @param assetInfo - The first asset info from link's asset_info array
 * @param walletToken - Optional token from wallet store (for symbol and decimals)
 * @param tokenMeta - Optional token metadata (for symbol and decimals fallback)
 * @returns Object with tokenAddress, symbol, and formatted amount, or null if assetInfo is missing
 */
export function getFirstAssetDisplayInfo(
  assetInfo: AssetInfo | null | undefined,
  walletToken: TokenWithPriceAndBalance | null | undefined = null,
  tokenMeta: IcrcTokenMetadata | null | undefined = null,
): FirstAssetDisplayInfo | null {
  if (!assetInfo) {
    return null;
  }

  // Derive address from asset
  const tokenAddress =
    assetInfo.asset.address?.toText?.() ??
    assetInfo.asset.address?.toString?.() ??
    "";

  if (!tokenAddress) {
    return null;
  }

  // Get symbol (prefer walletToken, then tokenMeta, then default)
  // tokenMeta.symbol can be an array ([] | [string]) or a string
  // Do NOT use assetInfo.label as it may contain link type (tip, airdrop) instead of currency symbol
  let tokenMetaSymbol: string | null = null;
  if (tokenMeta?.symbol) {
    if (Array.isArray(tokenMeta.symbol) && tokenMeta.symbol.length > 0) {
      tokenMetaSymbol = tokenMeta.symbol[0];
    } else if (typeof tokenMeta.symbol === "string") {
      tokenMetaSymbol = tokenMeta.symbol;
    }
  }

  const symbol = walletToken?.symbol ?? tokenMetaSymbol ?? "TOKEN";

  // Get decimals (prefer walletToken, then tokenMeta, then default to 8)
  // tokenMeta.decimals is an array ([] | [number]), so we take the first element
  const decimals =
    walletToken?.decimals ??
    (Array.isArray(tokenMeta?.decimals) &&
    tokenMeta.decimals.length > 0 &&
    typeof tokenMeta.decimals[0] === "number"
      ? tokenMeta.decimals[0]
      : null) ??
    8;

  // Get amount as number (will be formatted in component with proper decimals)
  const amount = parseBalanceUnits(
    assetInfo.amount_per_link_use_action,
    decimals,
  );

  return {
    tokenAddress,
    symbol,
    amount,
    decimals,
  };
}
