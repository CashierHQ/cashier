import type { LinkDto } from "$lib/generated/cashier_backend/cashier_backend.did";
import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { accountState } from "$modules/shared/state/auth.svelte";
import { derived } from "svelte/store";
import { cashierBackendService } from "../services/cashierBackend";

// A state for the user tokens list
export const linkListQuery = managedState<LinkDto[]>({
  queryFn: async () => {
    return (await cashierBackendService.getLinks()).unwrap();
  },
  effect: true,
});
