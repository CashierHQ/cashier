import { managedState } from "$lib/managedState";
import { tokenStorageService } from "../services/tokenStorage";

export const listTokensQuery = managedState<any[]>({
  queryFn: async () => {
    // Placeholder for actual token listing logic
    return tokenStorageService.listTokens();
  },
  persistedKey: ["listTokensQuery"],
  storageType: "localStorage",
});

export const walletStore = {};
