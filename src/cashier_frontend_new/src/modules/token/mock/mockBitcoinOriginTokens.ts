import type { TokenMetadata } from "$modules/token/types";

export function getMockBitcoinOriginTokens(): TokenMetadata[] {
  return [
    {
      address: "rrkah-fqaaa-aaaaa-aaaaq-cai",
      name: "ORDI",
      symbol: "ORDI",
      decimals: 8,
      enabled: true,
      fee: 10_000n,
      is_default: false,
      origin: {
        network: "Bitcoin",
        protocol: "BRC-20",
        tokenName: "ORDI",
        tokenId: "-",
      },
    },
    {
      address: "xevnm-gaaaa-aaaar-qafnq-cai",
      name: "DOG*GO*TO*THE*MOON",
      symbol: "DOG.OT",
      decimals: 8,
      enabled: true,
      fee: 10_000n,
      is_default: false,
      origin: {
        network: "Bitcoin",
        protocol: "Rune",
        tokenName: "DOG*GO*TO*THE*MOON",
        runeId: "84000:3",
      },
    },
    {
      address: "ss2fx-dyaaa-aaaar-qacoq-cai",
      name: "Mock Token Alpha",
      symbol: "MTA",
      decimals: 8,
      enabled: true,
      fee: 10_000n,
      is_default: false,
    },
    {
      address: "oj6if-riaaa-aaaaq-aaeha-cai",
      name: "Mock Token Beta",
      symbol: "MTB",
      decimals: 8,
      enabled: true,
      fee: 10_000n,
      is_default: false,
    },
  ];
}

export const MOCK_TOKEN_ADDRESSES = new Set(
  getMockBitcoinOriginTokens().map((token) => token.address),
);

export function isMockToken(address: string): boolean {
  return MOCK_TOKEN_ADDRESSES.has(address);
}

export function mergeMockBitcoinOriginTokens(
  fetchedTokens: TokenMetadata[],
): TokenMetadata[] {
  const tokensByAddress = new Map(
    fetchedTokens.map((token) => [token.address, token]),
  );

  for (const mockToken of getMockBitcoinOriginTokens()) {
    const existingToken = tokensByAddress.get(mockToken.address);

    if (existingToken) {
      tokensByAddress.set(
        mockToken.address,
        mockToken.origin
          ? {
              ...existingToken,
              name: mockToken.name,
              symbol: mockToken.symbol,
              origin: mockToken.origin,
            }
          : existingToken,
      );
      continue;
    }

    tokensByAddress.set(mockToken.address, mockToken);
  }

  return Array.from(tokensByAddress.values());
}
