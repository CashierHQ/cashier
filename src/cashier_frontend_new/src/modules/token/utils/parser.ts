import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { rsMatch } from "$lib/rsMatch";
import { CKBTC_CANISTER_ID } from "$modules/token/constants";
import type { TokenMetadata } from "$modules/token/types";
import { TokenStandardMapper } from "$modules/token/types/tokenStandard";
import { fromNullable } from "@dfinity/utils";

/**
 * Parse a single TokenDto from the Token Storage canister into TokenMetadata.
 * @param token Raw TokenDto from the canister
 * @returns TokenMetadata or null if the token has an unsupported chain
 */
export function parseTokenDto(
  token: tokenStorage.TokenDto,
): TokenMetadata | null {
  return rsMatch(token.id, {
    IC: (data) => {
      const indexId =
        fromNullable(token.details.IC.index_id)?.toText() ?? undefined;
      const tokenAddress = data.ledger_id.toText();
      const tokenSymbol =
        tokenAddress === CKBTC_CANISTER_ID ? "BTC" : token.symbol;
      const tokenStandards = token.details.IC.supported_standards.map(
        (standard) => TokenStandardMapper.fromBackendType(standard),
      );
      const runeInfo = fromNullable(token.rune_info);
      return {
        address: tokenAddress,
        name: token.name,
        symbol: tokenSymbol,
        decimals: token.decimals,
        enabled: token.enabled,
        fee: token.details.IC.fee,
        is_default: token.is_default,
        indexId,
        tokenStandards,
        isRune: fromNullable(token.is_rune),
        runeInfo: runeInfo
          ? {
              runeId: runeInfo.rune_id,
              tokenId: runeInfo.token_id,
              icon: fromNullable(runeInfo.icon) ?? undefined,
            }
          : undefined,
      };
    },
  });
}

/**
 * Parse the list of tokens from the Token Storage canister response.
 * @param response Response from the Token Storage canister
 * @returns Array of TokenMetadata
 */
export function parseListTokens(
  response: tokenStorage.Result_8,
): TokenMetadata[] {
  if ("Err" in response) {
    const [errorKind, errorValue] = Object.entries(response.Err)[0];
    const errorMessage =
      typeof errorValue === "string"
        ? errorValue
        : errorValue === null
          ? errorKind
          : JSON.stringify(errorValue);
    throw new Error(`Error fetching tokens: ${errorMessage}`);
  }

  const result = response.Ok;
  if (result.tokens && result.tokens.length > 0) {
    return result.tokens
      .map(parseTokenDto)
      .filter((t): t is TokenMetadata => t !== null);
  } else {
    return [];
  }
}
