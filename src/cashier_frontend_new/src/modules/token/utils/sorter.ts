import { balanceToUSDValue } from "$modules/shared/utils/converter";
import { ICP_LEDGER_CANISTER_ID } from "../constants";
import type { TokenWithPriceAndBalance } from "../types";

/**
 * Sorts wallet tokens by tier:
 *   1. enabled + is_default + USD > 0   — USD desc
 *   2. enabled + !is_default + USD > 0  — USD desc
 *   3. enabled + USD = 0                — ICP first, then default, then address
 *   4. disabled (any value)             — USD desc, then address
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

    if (ta === 1 || ta === 2 || ta === 4) {
      if (aUSD !== bUSD) return bUSD - aUSD;
    }

    if (ta === 3) {
      if (a.address === ICP_LEDGER_CANISTER_ID) return -1;
      if (b.address === ICP_LEDGER_CANISTER_ID) return 1;
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    }

    return a.address.localeCompare(b.address);
  });
}

function tierOf(token: TokenWithPriceAndBalance, usdValue: number): 1 | 2 | 3 | 4 {
  if (!token.enabled) return 4;
  if (usdValue > 0) return token.is_default ? 1 : 2;
  return 3;
}
