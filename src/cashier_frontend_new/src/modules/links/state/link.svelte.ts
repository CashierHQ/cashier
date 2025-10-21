import type { GetLinkResp } from "$lib/generated/cashier_backend/cashier_backend.did";
import { managedState } from "$lib/managedState";
import { cashierBackendService } from "../services/cashierBackend";

// A state for the user tokens list
// Fetches a single link by ID, if fetched error occurs, it throws an error
export const linkQuery = (id: string) =>
  managedState<GetLinkResp>({
    queryFn: async () => {
      const link = await cashierBackendService.getLink(id);
      if (link.isErr()) {
        throw new Error(`Failed to fetch link: ${link.error}`);
      }
      return link.unwrap();
    },
    watch: true,
  });
