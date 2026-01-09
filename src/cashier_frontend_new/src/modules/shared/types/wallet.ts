export enum WalletViewType {
  MAIN = "main",
  TOKEN = "token",
  RECEIVE = "receive",
  SEND = "send",
  IMPORT = "import",
  MANAGE = "manage",
  ADD_NFT = "add_nft",
}

export type WalletView =
  | { type: WalletViewType.MAIN }
  | { type: WalletViewType.TOKEN; token: string }
  | { type: WalletViewType.RECEIVE; token?: string }
  | { type: WalletViewType.SEND; token?: string }
  | { type: WalletViewType.IMPORT }
  | { type: WalletViewType.MANAGE }
  | { type: WalletViewType.ADD_NFT };
