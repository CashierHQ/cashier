import { managedState } from "$lib/managedState";
import type { TokenMetadata } from "$modules/token/types";
import { tokenStorageService } from "../services/tokenStorage";

export const listTokensQuery = managedState<TokenMetadata[]>({
  queryFn: async () => {
    // Placeholder for actual token listing logic
    return tokenStorageService.listTokens();
  },
  persistedKey: ["listTokensQuery"],
  storageType: "localStorage",
});

export const walletStore = {};
