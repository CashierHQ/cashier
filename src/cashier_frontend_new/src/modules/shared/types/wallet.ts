import type { WalletTab } from "$modules/wallet/types";

/**
 * Drawer-level wallet screens.
 */
export enum WalletViewType {
  MAIN = "main",
  TOKEN = "token",
  RECEIVE = "receive",
  SEND = "send",
  NFT_RECEIVE = "nft_receive",
  NFT_SEND = "nft_send",
  IMPORT = "import",
  MANAGE = "manage",
  ADD_NFT = "add_nft",
  MANAGE_COLLECTIONS = "manage_collections",
}

/**
 * Navigation state for the wallet drawer.
 *
 * Each union member describes the active wallet screen and any screen-specific
 * context needed to render it.
 */
export type WalletView =
  | {
      type: WalletViewType.MAIN;
      tab?: WalletTab;
      selectedCollectionId?: string;
      selectedTokenId?: bigint;
    }
  | { type: WalletViewType.TOKEN; token: string }
  | { type: WalletViewType.RECEIVE; token?: string }
  | { type: WalletViewType.SEND; token?: string }
  | { type: WalletViewType.NFT_RECEIVE; collectionId?: string }
  | { type: WalletViewType.NFT_SEND; collectionId?: string; tokenId?: bigint }
  | { type: WalletViewType.IMPORT }
  | { type: WalletViewType.MANAGE }
  | { type: WalletViewType.ADD_NFT }
  | { type: WalletViewType.MANAGE_COLLECTIONS };
