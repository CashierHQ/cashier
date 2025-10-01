import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import type { TokenMetadata } from "$modules/token/types";
import type { Principal } from "@dfinity/principal";

/**
 * Parse the list of tokens from the Token Storage canister response.
 * @param response Response from the Token Storage canister
 * @returns Array of TokenMetadata
 */
export function parseListTokens(
  response: tokenStorage.Result_5,
): TokenMetadata[] {
  if ("Err" in response) {
    throw new Error(`Error fetching tokens: ${response.Err}`);
  }

  const result = response.Ok;
  if (result.tokens && result.tokens.length > 0) {
    return result.tokens.map((token) => {
      if ("IC" in token.id) {
        const ledgerId: Principal = token.id.IC.ledger_id;
        return {
          address: ledgerId,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          enabled: token.enabled,
        };
      } else {
        throw new Error("Unsupported token type");
      }
    });
  } else {
    return [];
  }
}
