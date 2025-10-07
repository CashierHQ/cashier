import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { rsMatch } from "$lib/rsMatch";
import type { TokenMetadata } from "$modules/token/types";

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
      return rsMatch(token.id, {
        IC: (data) => {
          return {
            address: data.ledger_id.toText(),
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            enabled: token.enabled,
            fee: token.details.IC.fee,
          };
        },
      });
    });
  } else {
    return [];
  }
}
