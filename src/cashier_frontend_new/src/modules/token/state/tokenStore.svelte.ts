import { managedState } from "$lib/managedState";
import type { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import { tokenMetadataService } from "../services/tokenMetadata";
import type { TokenPrice } from "../types";

let tokenPrices = $state<TokenPrice[]>([]);
let isLoading = $state<boolean>(false);

// DEMO of using a shared state with data from server
// Returns a state for token metadata
export const tokenMetadataQuery = (tokenAddress: string) =>
  managedState<IcrcTokenMetadata | undefined>({
    queryFn: async () => {
      return tokenMetadataService.getTokenMetadata(tokenAddress);
    },
    persistedKey: ["tokenMetadataQuery", tokenAddress],
    storageType: "localStorage",
  });

export const tokenStore = {
  get tokenPrices() {
    return tokenPrices;
  },

  set tokenPrices(value: TokenPrice[]) {
    tokenPrices = value;
  },

  get isLoading() {
    return isLoading;
  },

  set isLoading(value: boolean) {
    isLoading = value;
  },
};
