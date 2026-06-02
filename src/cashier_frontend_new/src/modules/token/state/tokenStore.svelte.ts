import { managedState } from "$lib/managedState";
import type { ManagedState } from "$lib/managedState/managedState.svelte";
import { tokenMetadataService } from "$modules/token/services/tokenMetadata";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import type { TokenMetadata } from "$modules/token/types";
import type { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import { Principal } from "@icp-sdk/core/principal";

/**
 * Reactive query that fetches a token's registry metadata (including runeInfo)
 * from the token storage canister without requiring authentication.
 * Used as a fallback on public landing pages where walletStore has no data.
 */
export const tokenRegistryQuery = (
  tokenAddress: string,
): ManagedState<TokenMetadata | null> =>
  managedState({
    queryFn: async () => {
      try {
        return await tokenStorageService.getTokenById(
          Principal.fromText(tokenAddress),
        );
      } catch {
        return null;
      }
    },
    persistedKey: ["tokenRegistryQuery", tokenAddress],
    storageType: "localStorage",
  });

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
