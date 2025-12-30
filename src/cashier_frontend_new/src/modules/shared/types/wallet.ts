export enum WalletViewType {
  MAIN = "main",
  TOKEN = "token",
  RECEIVE = "receive",
  SEND = "send",
  IMPORT = "import",
  MANAGE = "manage",
}

export type WalletView =
  | { type: WalletViewType.MAIN }
  | { type: WalletViewType.TOKEN; token: string }
  | { type: WalletViewType.RECEIVE; token?: string }
  | { type: WalletViewType.SEND; token?: string }
  | { type: WalletViewType.IMPORT }
  | { type: WalletViewType.MANAGE };
