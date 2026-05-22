import type { TokenWithPriceAndBalance } from "$modules/token/types";

export type BitcoinTokenOriginProtocol = "BRC-20" | "Rune";

export type TokenOrigin = {
  network: "Bitcoin";
  protocol: BitcoinTokenOriginProtocol;
  tokenName: string;
  tokenId?: string;
  runeId?: string;
};

export function getTokenOriginLabel(origin: TokenOrigin): string {
  return `${origin.network} ${origin.protocol}`;
}

export function getTokenOrigin(
  tokenDetails: TokenWithPriceAndBalance,
): TokenOrigin | null {
  if (!tokenDetails.isRune) return null;

  return {
    network: "Bitcoin",
    protocol: "Rune",
    tokenName: tokenDetails.name,
    tokenId: tokenDetails.runeInfo?.tokenId,
    runeId: tokenDetails.runeInfo?.runeId,
  };
}
