import type {
  EnrichedNFT,
  NftCollectionSummary,
} from "$modules/wallet/types/nft";
import { NFT_FALLBACK_IMAGE_URL } from "$modules/wallet/constants";

export const MOCK_NFT_COLLECTIONS: NftCollectionSummary[] = [
  {
    collectionId: "mock-bored-ape",
    name: "Bored Ape Collection",
    description:
      "BAYC is a collection of 10,000 unique Bored Ape NFTs, digital collectibles living on the Internet Computer blockchain.",
    imageUrl: NFT_FALLBACK_IMAGE_URL,
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
    imageUrl: NFT_FALLBACK_IMAGE_URL,
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
    imageUrl: NFT_FALLBACK_IMAGE_URL,
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
    imageUrl: NFT_FALLBACK_IMAGE_URL,
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
    imageUrl: NFT_FALLBACK_IMAGE_URL,
    itemCount: 11,
    supply: "12 000",
    floor: "1.2 ICP",
    type: "Bears",
    standard: "ICRC-7",
    symbol: "BEAR",
  },
];

const mockNftImages = {
  boredApe: [
    NFT_FALLBACK_IMAGE_URL,
    NFT_FALLBACK_IMAGE_URL,
    NFT_FALLBACK_IMAGE_URL,
    NFT_FALLBACK_IMAGE_URL,
    NFT_FALLBACK_IMAGE_URL,
    NFT_FALLBACK_IMAGE_URL,
  ],
  cryptopunks: [
    NFT_FALLBACK_IMAGE_URL,
    NFT_FALLBACK_IMAGE_URL,
    NFT_FALLBACK_IMAGE_URL,
  ],
  azuki: [
    NFT_FALLBACK_IMAGE_URL,
    NFT_FALLBACK_IMAGE_URL,
    NFT_FALLBACK_IMAGE_URL,
  ],
  pudgy: [NFT_FALLBACK_IMAGE_URL],
  bears: [NFT_FALLBACK_IMAGE_URL],
};

const collectionById = new Map(
  MOCK_NFT_COLLECTIONS.map((collection) => [
    collection.collectionId,
    collection,
  ]),
);

function addCollectionDetails(nft: EnrichedNFT): EnrichedNFT {
  const collection = collectionById.get(nft.collectionId);

  if (!collection) {
    return nft;
  }

  return {
    ...nft,
    collectionName: collection.name,
    collectionDescription: collection.description,
    collectionImageUrl: collection.imageUrl,
    collectionSymbol: collection.symbol,
    supply: collection.supply,
    floor: collection.floor,
    type: collection.type,
    standard: collection.standard,
    symbol: collection.symbol,
  };
}

export const MOCK_NFTS: EnrichedNFT[] = [
  ...mockNftImages.boredApe.map((imageUrl, index) => ({
    collectionId: "mock-bored-ape",
    tokenId: BigInt([3429, 1590, 8834, 204, 6612, 7781][index]),
    name: `Bored Ape #${[3429, 1590, 8834, 204, 6612, 7781][index]}`,
    description: "Bored Ape collection test NFT",
    imageUrl,
    collectionName: "Bored Ape Collection",
    rarity: ["2.1%", "0.3%", "5.4%", "0.05%", "1.7%", "3.2%"][index],
    mintedAt: "2024-03-15",
    lastTransferAt: "2024-11-02",
    attributes: [
      { traitType: "Background", value: "Aquamarine", rarity: "12.4%" },
      { traitType: "Fur", value: "Zombie", rarity: "3.0%" },
      { traitType: "Eyes", value: "Laser Eyes", rarity: "0.69%" },
      { traitType: "Mouth", value: "Bored Cigarette", rarity: "7.1%" },
    ],
  })),
  ...mockNftImages.cryptopunks.map((imageUrl, index) => ({
    collectionId: "mock-cryptopunks",
    tokenId: BigInt(index + 1),
    name: `CryptoPunk #${index + 1}`,
    description: "CryptoPunks collection test NFT",
    imageUrl,
    collectionName: "CryptoPunks",
    rarity: ["1.4%", "2.8%", "4.1%"][index],
    mintedAt: "2024-04-08",
    lastTransferAt: "2024-10-18",
    attributes: [
      { traitType: "Type", value: "Pixel", rarity: "18.0%" },
      { traitType: "Accessory", value: "Glasses", rarity: "6.2%" },
    ],
  })),
  ...mockNftImages.azuki.map((imageUrl, index) => ({
    collectionId: "mock-azuki",
    tokenId: BigInt(index + 1),
    name: `Azuki #${index + 1}`,
    description: "Azuki collection test NFT",
    imageUrl,
    collectionName: "Azuki",
    rarity: ["6.1%", "3.7%", "9.2%"][index],
    mintedAt: "2024-06-21",
    lastTransferAt: "2024-12-04",
    attributes: [
      { traitType: "Background", value: "Sakura", rarity: "8.8%" },
      { traitType: "Hair", value: "Indigo", rarity: "5.1%" },
      { traitType: "Clothing", value: "Kimono", rarity: "3.4%" },
    ],
  })),
  {
    collectionId: "mock-pudgy-penguins",
    tokenId: 1n,
    name: "Pudgy Penguin #1",
    description: "Pudgy Penguins collection test NFT",
    imageUrl: mockNftImages.pudgy[0],
    collectionName: "Pudgy Penguins",
    rarity: "4.3%",
    mintedAt: "2024-05-11",
    lastTransferAt: "2024-09-29",
    attributes: [
      { traitType: "Body", value: "Blue", rarity: "10.2%" },
      { traitType: "Face", value: "Happy", rarity: "7.6%" },
    ],
  },
  ...Array.from({ length: 11 }, (_, index) => ({
    collectionId: "mock-baby-bears",
    tokenId: BigInt(index + 1),
    name: `Baby Bear #${index + 1}`,
    description: "Baby Bears collection test NFT",
    imageUrl: mockNftImages.bears[0],
    collectionName: "Baby Bears",
    rarity: `${index + 1}.0%`,
    mintedAt: "2024-02-10",
    lastTransferAt: "2024-08-14",
    attributes: [
      { traitType: "Mood", value: "Calm", rarity: "11.0%" },
      { traitType: "Color", value: "Honey", rarity: "9.5%" },
    ],
  })),
].map(addCollectionDetails);
