import { balanceToUSDValue } from "$modules/shared/utils/converter";
import { ICP_LEDGER_CANISTER_ID } from "../constants";
import type { TokenWithPriceAndBalance } from "../types";

/**
 * Sorts an array of wallet tokens with the following criteria:
 * 1. Enabled tokens come first, disabled tokens last
 * 2. Within enabled tokens: tokens with USD value > 0 first, sorted by USD value descending
 * 3. Within enabled tokens with USD value = 0:
 *    3.1. ICP token first
 *    3.2. Then by default tokens (is_default = true)
 *    3.3. Within same group (both default or both non-default), sort by address
 * 4. Disabled tokens sorted by: default first, then by address
 * @param enrichedTokens Array of tokens with price and balance information
 * @return Sorted array of tokens
 */
export function sortWalletTokens(
  enrichedTokens: TokenWithPriceAndBalance[],
): TokenWithPriceAndBalance[] {
  return [...enrichedTokens].sort((a, b) => {
    // Enabled tokens come first
    if (a.enabled && !b.enabled) return -1;
    if (!a.enabled && b.enabled) return 1;

    // Both disabled - sort by default first, then by address
    if (!a.enabled && !b.enabled) {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return a.address.localeCompare(b.address);
    }

    // Both enabled - use balance for USD value calculation
    const aUSDValue = balanceToUSDValue(
      a.balance ?? BigInt(0),
      a.decimals,
      a.priceUSD,
    );
    const bUSDValue = balanceToUSDValue(
      b.balance ?? BigInt(0),
      b.decimals,
      b.priceUSD,
    );

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
