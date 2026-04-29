import { balanceToUSDValue } from "$modules/shared/utils/converter";
import { ICP_LEDGER_CANISTER_ID } from "../constants";
import type { TokenWithPriceAndBalance } from "../types";

/**
 * Sorts wallet tokens by tier:
 *   1. enabled + USD > 0   — USD desc
 *   2. enabled + USD = 0   — ICP first, then default, then address
 *   3. disabled (any value) — USD desc, then address
 */
export function sortWalletTokens(
  enrichedTokens: TokenWithPriceAndBalance[],
): TokenWithPriceAndBalance[] {
  return [...enrichedTokens].sort((a, b) => {
    const aUSD = balanceToUSDValue(a.balance, a.decimals, a.priceUSD);
    const bUSD = balanceToUSDValue(b.balance, b.decimals, b.priceUSD);
    const ta = tierOf(a, aUSD);
    const tb = tierOf(b, bUSD);

    if (ta !== tb) return ta - tb;

    if (ta === 1 || ta === 3) {
      if (aUSD !== bUSD) return bUSD - aUSD;
    }

    if (ta === 2) {
      if (a.address === ICP_LEDGER_CANISTER_ID) return -1;
      if (b.address === ICP_LEDGER_CANISTER_ID) return 1;
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    }

    return a.address.localeCompare(b.address);
  });
}

/**
 * Maps a token to its display tier. Lower number = higher in the list.
 *   1 — enabled token holding value (sorted by USD desc, default flag ignored)
 *   2 — enabled but zero balance (parked, ICP/defaults pinned within)
 *   3 — disabled by user (sinks below everything regardless of value)
 */
function tierOf(
  token: TokenWithPriceAndBalance,
  usdValue: number,
): 1 | 2 | 3 {
  if (!token.enabled) return 3;
  return usdValue > 0 ? 1 : 2;
}
