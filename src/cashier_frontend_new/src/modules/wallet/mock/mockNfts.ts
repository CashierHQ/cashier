import type {
  EnrichedNFT,
  NftCollectionSummary,
} from "$modules/wallet/types/nft";

function svgDataUri(background: string, foreground: string, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${background}"/><circle cx="200" cy="155" r="82" fill="${foreground}" opacity=".92"/><rect x="110" y="235" width="180" height="92" rx="34" fill="${foreground}" opacity=".78"/><text x="200" y="214" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="62" font-weight="700" fill="#fff">${label}</text></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const MOCK_NFT_COLLECTIONS: NftCollectionSummary[] = [
  {
    collectionId: "mock-bored-ape",
    name: "Bored Ape Collection",
    description:
      "BAYC is a collection of 10,000 unique Bored Ape NFTs, digital collectibles living on the Internet Computer blockchain.",
    imageUrl: svgDataUri("#18d9ad", "#8b6a4d", "BA"),
    itemCount: 6,
    supply: "10 000",
    floor: "12.4 ICP",
    type: "Yuga Labs",
    standard: "ICRC-7",
    symbol: "BAYC",
  },
  {
    collectionId: "mock-cryptopunks",
    name: "CryptoPunks",
    description:
      "A compact set of pixel-style collectible characters for wallet UI testing.",
    imageUrl: svgDataUri("#94a3b8", "#1f2937", "CP"),
    itemCount: 3,
    supply: "10 000",
    floor: "8.1 ICP",
    type: "Larva Labs",
    standard: "ICRC-7",
    symbol: "PUNK",
  },
  {
    collectionId: "mock-azuki",
    name: "Azuki",
    description: "Anime-inspired collection placeholder for disabled state UI.",
    imageUrl: "",
    itemCount: 3,
    supply: "10 000",
    floor: "4.2 ICP",
    type: "Chiru Labs",
    standard: "ICRC-7",
    symbol: "AZUKI",
  },
  {
    collectionId: "mock-pudgy-penguins",
    name: "Pudgy Penguins",
    description: "Penguin collection placeholder for collection-card layouts.",
    imageUrl: svgDataUri("#e0f2fe", "#38bdf8", "PP"),
    itemCount: 1,
    supply: "8 888",
    floor: "5.7 ICP",
    type: "Pudgy",
    standard: "ICRC-7",
    symbol: "PPG",
  },
  {
    collectionId: "mock-baby-bears",
    name: "Baby Bears",
    description: "Lightweight collection used for disabled toggle examples.",
    imageUrl: svgDataUri("#dcfce7", "#166534", "BB"),
    itemCount: 11,
    supply: "12 000",
    floor: "1.2 ICP",
    type: "Bears",
    standard: "ICRC-7",
    symbol: "BEAR",
  },
];

export const MOCK_DISABLED_COLLECTION_IDS = ["mock-baby-bears"];

const mockNftImages = {
  boredApe: [
    svgDataUri("#e6e7a4", "#8b6a4d", "3429"),
    svgDataUri("#d7c39d", "#8b6a4d", "1590"),
    svgDataUri("#1bd9ae", "#8b6a4d", "8834"),
    svgDataUri("#f59e0b", "#8b6a4d", "204"),
    svgDataUri("#22d3ee", "#8b6a4d", "6612"),
    svgDataUri("#c4b5fd", "#8b6a4d", "7781"),
  ],
  cryptopunks: [
    svgDataUri("#cbd5e1", "#111827", "101"),
    svgDataUri("#94a3b8", "#334155", "202"),
    svgDataUri("#e2e8f0", "#475569", "303"),
  ],
  azuki: [
    svgDataUri("#f5f0ff", "#8b5cf6", "AZ1"),
    svgDataUri("#f5f0ff", "#8b5cf6", "AZ2"),
    svgDataUri("#f5f0ff", "#8b5cf6", "AZ3"),
  ],
  pudgy: [svgDataUri("#dbeafe", "#0ea5e9", "PP1")],
  bears: [svgDataUri("#dcfce7", "#15803d", "BB1")],
};

export const MOCK_NFTS: EnrichedNFT[] = [
  ...mockNftImages.boredApe.map((imageUrl, index) => ({
    collectionId: "mock-bored-ape",
    tokenId: BigInt([3429, 1590, 8834, 204, 6612, 7781][index]),
    name: `Bored Ape #${[3429, 1590, 8834, 204, 6612, 7781][index]}`,
    description: "Bored Ape collection test NFT",
    imageUrl,
    collectionName: "Bored Ape Collection",
    rarity: ["2.1%", "0.3%", "5.4%", "0.05%", "1.7%", "3.2%"][index],
  })),
  ...mockNftImages.cryptopunks.map((imageUrl, index) => ({
    collectionId: "mock-cryptopunks",
    tokenId: BigInt(index + 1),
    name: `CryptoPunk #${index + 1}`,
    description: "CryptoPunks collection test NFT",
    imageUrl,
    collectionName: "CryptoPunks",
    rarity: ["1.4%", "2.8%", "4.1%"][index],
  })),
  ...mockNftImages.azuki.map((imageUrl, index) => ({
    collectionId: "mock-azuki",
    tokenId: BigInt(index + 1),
    name: `Azuki #${index + 1}`,
    description: "Azuki collection test NFT",
    imageUrl,
    collectionName: "Azuki",
    rarity: ["6.1%", "3.7%", "9.2%"][index],
  })),
  {
    collectionId: "mock-pudgy-penguins",
    tokenId: 1n,
    name: "Pudgy Penguin #1",
    description: "Pudgy Penguins collection test NFT",
    imageUrl: mockNftImages.pudgy[0],
    collectionName: "Pudgy Penguins",
    rarity: "4.3%",
  },
  ...Array.from({ length: 11 }, (_, index) => ({
    collectionId: "mock-baby-bears",
    tokenId: BigInt(index + 1),
    name: `Baby Bear #${index + 1}`,
    description: "Baby Bears collection test NFT",
    imageUrl: mockNftImages.bears[0],
    collectionName: "Baby Bears",
    rarity: `${index + 1}.0%`,
  })),
];
