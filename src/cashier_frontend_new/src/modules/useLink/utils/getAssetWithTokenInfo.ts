import type { AssetInfo } from "$modules/links/types/link/asset";
import type { TokenWithPriceAndBalance } from "$modules/token/types";
import type { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import { parseBalanceUnits } from "$modules/shared/utils/converter";
import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";

export interface AssetWithTokenInfo {
  address: string;
  amount: number;
  symbol: string;
  decimals: number;
  priceUSD?: number;
  usdValue: number;
  logo: string;
}

/**
 * Get token information for an asset, including symbol, decimals, price, and formatted amount.
 * This utility extracts business logic from UI components.
 *
 * @param assetInfoItem - Asset info item from link's asset_info array
 * @param walletToken - Optional token from wallet store (for symbol, decimals, and price)
 * @param tokenMeta - Optional token metadata (for symbol and decimals fallback)
 * @returns Object with address, amount, symbol, decimals, priceUSD, usdValue, and logo
 */
export function getAssetWithTokenInfo(
  assetInfoItem: AssetInfo,
  walletToken: TokenWithPriceAndBalance | undefined = undefined,
  tokenMeta: IcrcTokenMetadata | undefined = undefined,
): AssetWithTokenInfo {
  // Derive address from asset
  const address =
    assetInfoItem.asset.address?.toText?.() ??
    assetInfoItem.asset.address?.toString?.() ??
    "";

  // Get symbol (prefer walletToken, then tokenMeta, then label, then default)
  // tokenMeta.symbol can be an array ([] | [string]) or a string
  let tokenMetaSymbol: string | null = null;
  if (tokenMeta?.symbol) {
    if (Array.isArray(tokenMeta.symbol) && tokenMeta.symbol.length > 0) {
      tokenMetaSymbol = tokenMeta.symbol[0];
    } else if (typeof tokenMeta.symbol === "string") {
      tokenMetaSymbol = tokenMeta.symbol;
    }
  }

  const symbol =
    walletToken?.symbol ?? tokenMetaSymbol ?? (assetInfoItem.label || "TOKEN");

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

  // Get price from walletToken
  const priceUSD = walletToken?.priceUSD;

  // Calculate amount in human-readable format
  const amount = parseBalanceUnits(
    assetInfoItem.amount_per_link_use_action,
    decimals,
  );

  // Calculate USD value
  const usdValue = priceUSD ? amount * priceUSD : 0;

  // Get token logo URL
  const logo = getTokenLogo(address);

  return {
    address,
    amount,
    symbol,
    decimals,
    priceUSD,
    usdValue,
    logo,
  };
}
