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
