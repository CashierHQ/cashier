import { managedState } from "$lib/managedState";
import { tokenStorageService } from "$modules/token/services/tokenStorage";
import type { TokenMetadata } from "$modules/token/types";

export const listTokensQuery = managedState<TokenMetadata[]>({
  queryFn: async () => {
    return tokenStorageService.listTokens();
  },
  persistedKey: ["listTokensQuery"],
  storageType: "localStorage",
});
