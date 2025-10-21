import { balanceToUSDValue } from "$modules/shared/utils/converter";
import { ICP_LEDGER_CANISTER_ID } from "../constants";
import type { TokenWithPriceAndBalance } from "../types";

/**
 * Sorts an array of wallet tokens with the following criteria:
 * 1. Tokens with USD value > 0 come first, sorted by USD value descending
 * 2. Tokens with USD value = 0 come last, sorted by:
 *    2.1. ICP token first
 *    2.2. Then by default tokens (is_default = true)
 *    2.3. Within same group (both default or both non-default), sort by address
 * @param enrichedTokens Array of tokens with price and balance information
 * @return Sorted array of tokens
 */
export function sortWalletTokens(
  enrichedTokens: TokenWithPriceAndBalance[],
): TokenWithPriceAndBalance[] {
  return [...enrichedTokens].sort((a, b) => {
    const aUSDValue = balanceToUSDValue(a.balance, a.decimals, a.priceUSD);
    const bUSDValue = balanceToUSDValue(b.balance, b.decimals, b.priceUSD);

    // Tokens with USD value > 0 come first
    if (aUSDValue > 0 && bUSDValue > 0) {
      // Both have USD value, sort by USD value descending
      return bUSDValue - aUSDValue;
    }

    if (aUSDValue > 0) return -1;
    if (bUSDValue > 0) return 1;

    // Both have USD value = 0, apply further sorting criteria
    // ICP token first
    if (a.address === ICP_LEDGER_CANISTER_ID) return -1;
    if (b.address === ICP_LEDGER_CANISTER_ID) return 1;

    // Then by default tokens
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;

    // Within same group (both default or both non-default), sort by address
    return a.address.localeCompare(b.address);
  });
}
