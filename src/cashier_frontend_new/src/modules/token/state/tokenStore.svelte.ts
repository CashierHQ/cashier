import { managedState } from "$lib/managedState";
import type { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import { tokenMetadataService } from "../services/tokenMetadata";
import { tokenPriceService } from "../services/tokenPrice";
import { userTokenService } from "../services/userToken";
import type { TokenPrice } from "../types";

let tokenPrices = $state<TokenPrice[]>([]);
let isLoading = $state<boolean>(false);

export const userTokenQuery = managedState<any[]>({
  queryFn: async () => {
    return userTokenService.listTokens();
  },
  // Optionally, you can set a refetch interval
  // refetchInterval: 60000, // Refetch every 60 seconds
  persistedKey: ["userTokenQuery"],
  storageType: "localStorage",
});

// A state for token prices
export const tokenPriceQuery = managedState<TokenPrice[]>({
  queryFn: async () => {
    // console.log("fetching token prices from react-query");
    return tokenPriceService.getTokenPrices();
  },
  //refetchInterval: 10_000, // demo timeout, to be adjusted
  persistedKey: ["tokenPriceQuery"],
  storageType: "localStorage",
});

// DEMO of using a shared state with data from server
// Returns a state for token metadata
export const tokenMetadataQuery = (tokenAddress: string) =>
  managedState<IcrcTokenMetadata | undefined>({
    queryFn: async () => {
      return tokenMetadataService.getTokenMetadata(tokenAddress);
    },
    //staleTime: 5_000, // demo timeout, to be adjusted
    //refetchInterval: 10_000, // demo timeout, to be adjusted
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
