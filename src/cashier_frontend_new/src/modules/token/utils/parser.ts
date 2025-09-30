import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import type { TokenMetadata } from "$modules/token/types";

export function parseListTokens(
  response: tokenStorage.Result_5,
): TokenMetadata[] {
  if ("Err" in response) {
    console.error("Error fetching tokens:", response.Err);
    throw new Error(`Error fetching tokens: ${response.Err}`);
  }

  let result = response.Ok;
  console.log("Token list response:", result);
  if (result.tokens && result.tokens.length > 0) {
    return result.tokens.map((token) => ({
      address: token.string_id.replace("IC:", ""),
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      iconUrl: null,
      standard: "unknown",
      enabled: token.enabled,
    }));
  } else {
    throw new Error("No tokens found in the response");
  }
}
