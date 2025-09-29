import { managedState } from "$lib/managedState";
import type { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import { tokenMetadataService } from "../services/tokenMetadata";
import type { TokenPrice } from "../types";
import { tokenPriceService } from "../services/tokenPrice";

  // A state for token prices
export const tokenPriceQuery = managedState<TokenPrice[]>({
  queryFn: async () => {
    // console.log("fetching token prices from react-query");
    return tokenPriceService.getTokens();
  },
  refetchInterval: 10_000, // demo timeout, to be adjusted
  persistedKey: ["tokenPriceQuery"],
  storageType: "localStorage",
  });

// DEMO of using a shared state with data from server
// Returns a state for token metadata
export const tokenMetadataQuery = (tokenAddress: string) => managedState<IcrcTokenMetadata | undefined>({
    queryFn: async () => {
      return tokenMetadataService.getTokenMetadata(tokenAddress);
    },
    staleTime: 5_000, // demo timeout, to be adjusted
    refetchInterval: 10_000, // demo timeout, to be adjusted
    persistedKey: ["tokenMetadataQuery", tokenAddress],
    storageType: "localStorage",
  });