import type { GetLinkResp } from "$lib/generated/cashier_backend/cashier_backend.did";
import { managedState } from "$lib/managedState";
import { cashierBackendService } from "../services/cashierBackend";

// A state for the user tokens list
export const linkQuery = (id: string) =>
  managedState<GetLinkResp>({
    queryFn: async () => {
      return (await cashierBackendService.getLink(id)).unwrap();
    },
    watch: true,
  });
