export enum WalletViewType {
  MAIN = "main",
  TOKEN = "token",
  RECEIVE = "receive",
  SEND = "send",
  NFT_RECEIVE = "nft_receive",
  IMPORT = "import",
  MANAGE = "manage",
  ADD_NFT = "add_nft",
  MANAGE_COLLECTIONS = "manage_collections",
}

export type WalletView =
  | { type: WalletViewType.MAIN }
  | { type: WalletViewType.TOKEN; token: string }
  | { type: WalletViewType.RECEIVE; token?: string }
  | { type: WalletViewType.SEND; token?: string }
  | { type: WalletViewType.NFT_RECEIVE; collectionId?: string }
  | { type: WalletViewType.IMPORT }
  | { type: WalletViewType.MANAGE }
  | { type: WalletViewType.ADD_NFT }
  | { type: WalletViewType.MANAGE_COLLECTIONS };
