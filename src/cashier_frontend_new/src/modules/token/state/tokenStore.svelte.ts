import { managedState } from "$lib/managedState";
import type { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import { tokenMetadataService } from "../services/tokenMetadata";
import type { ManagedState } from "$lib/managedState/managedState.svelte";

// DEMO of using a shared state with data from server
// Returns a state for token metadata
export const tokenMetadataQuery = (
  tokenAddress: string,
): ManagedState<IcrcTokenMetadata | undefined> =>
  managedState({
    queryFn: async () => {
      return tokenMetadataService.getTokenMetadata(tokenAddress);
    },
    persistedKey: ["tokenMetadataQuery", tokenAddress],
    storageType: "localStorage",
  });
