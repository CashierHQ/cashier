import { ICP_LEDGER_CANISTER_ID } from "../constants";
import type { TokenWithPriceAndBalance } from "../types";

/**
 * Sorts an array of wallet tokens with the following criteria:
 * 1. ICP token first
 * 2. Then by default tokens (is_default = true)
 * 3. Within same group (both default or both non-default), sort by address
 * @param enrichedTokens Array of tokens with price and balance information
 * @return Sorted array of tokens
 */
export function sortWalletTokens(
  enrichedTokens: TokenWithPriceAndBalance[],
): TokenWithPriceAndBalance[] {
  // Sort tokens: ICP first, then default tokens (by address), then non-default tokens (by address)
  return [...enrichedTokens].sort((a, b) => {
    // 1. ICP token first
    if (a.address === ICP_LEDGER_CANISTER_ID) return -1;
    if (b.address === ICP_LEDGER_CANISTER_ID) return 1;

    // 2. Then by default tokens
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;

    // 3. Within same group (both default or both non-default), sort by address
    return a.address.localeCompare(b.address);
  });
}
