// Mock transactions data
export const MOCK_TRANSACTIONS = [
  {
    type: "sent" as const,
    amount: 0.15432,
    address: "bc1qvgtcv8n5d48xkux7v34p8wezm3m0m0dw8t3c2sa",
    timestamp: 1727524800000,
  },
  {
    type: "received" as const,
    amount: 0.005,
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    timestamp: 1722254400000,
  },
  {
    type: "sent" as const,
    amount: 0.15432,
    address: "bc1q3j4k5l6m7n8p9q0r1s2t3u4v5w6x7y8z9a0b1c",
    timestamp: 1722268800000,
  },
];

// Mock networks data
export const MOCK_NETWORKS = [
  {
    id: "icp",
    name: "Internet Computer",
    iconUrl: "/icpLogo.png",
  },
  {
    id: "base",
    name: "Base",
    iconUrl: "https://avatars.githubusercontent.com/u/108554348?s=280&v=4",
  },
  {
    id: "eth",
    name: "Ethereum",
    iconUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  },
  {
    id: "sol",
    name: "Solana",
    iconUrl: "https://cryptologos.cc/logos/solana-sol-logo.png",
  },
  {
    id: "bnb",
    name: "BNB Chain",
    iconUrl: "https://cryptologos.cc/logos/bnb-bnb-logo.png",
  },
];

// Mock token data for import
export const MOCK_TOKEN_DATA = {
  name: "Kinic",
  symbol: "KINIC",
  logo: null as string | null,
  address: "",
};

// Security learn more URL
export const SECURITY_LEARN_MORE_URL = "https://example.com";
