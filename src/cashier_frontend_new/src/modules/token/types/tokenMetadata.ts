import { TokenStandard } from "$modules/token/types/tokenStandard";

/**
 * Type definitions for token metadata
 */
export type TokenMetadata = {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  enabled: boolean;
  fee: bigint;
  is_default: boolean;
  indexId?: string;
  tokenStandards?: TokenStandard[];
  isRune?: boolean;
  runeInfo?: {
    runeId: string;
    tokenId: string;
  };
};

/**
 * Type definition for a token with additional price and balance information
 */
export type TokenWithPriceAndBalance = TokenMetadata & {
  balance: bigint;
  priceUSD: number;
};

export class TokenMetadataHelper {
  static getTokenStandard(token: TokenMetadata): TokenStandard {
    if (
      token.tokenStandards &&
      token.tokenStandards.length > 0 &&
      !token.tokenStandards.includes(TokenStandard.ICRC2)
    ) {
      return TokenStandard.ICRC1; // if ICRC2 is not included, assume it's ICRC1
    }
    return TokenStandard.ICRC2;
  }
}
