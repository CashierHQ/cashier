import { managedState } from "$lib/managedState";
import type { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import type { ManagedState } from "$lib/managedState/managedState.svelte";
import { tokenMetadataService } from "$modules/token/services/tokenMetadata";

// DEMO of using a shared state with data from server
// Returns a state for token metadata
export const tokenMetadataQuery = (
  tokenAddress: string,
): ManagedState<IcrcTokenMetadata | undefined> =>
  managedState({
    queryFn: async () => {
      return tokenMetadataService.getTokenMetadata(tokenAddress);
    },
    staleTime: 120_000,
    persistedKey: ["tokenMetadataQuery", tokenAddress],
    storageType: "localStorage",
  });
