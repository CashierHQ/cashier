import { managedState } from "$lib/managedState";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import type { NFT } from "$modules/wallet/types/nft";

class WalletNftStore {
  #walletNftQuery;
  constructor() {
    this.#walletNftQuery = managedState<NFT[]>({
      queryFn: async () => {
        // Placeholder: Fetch user's NFTs from storage or API
        const nfts: NFT[] = await tokenStorageService.getNfts(0, 10);
        return nfts;
      },
      refetchInterval: 15_000, // Refresh every 15 seconds to keep NFTs up-to-date
      persistedKey: ["walletNftQuery"],
      storageType: "localStorage",
    });
  }

  get query() {
    return this.#walletNftQuery;
  }
}

export const walletNftStore = new WalletNftStore();
