/**
 * Receive address type enum
 */
export enum ReceiveAddressType {
  PRINCIPAL = "PRINCIPAL",
  ACCOUNT_ID = "ACCOUNT_ID",
}

export const WalletTab = {
  TOKENS: "TOKENS",
  NFTS: "NFTS",
} as const;

export type WalletTab = (typeof WalletTab)[keyof typeof WalletTab];
