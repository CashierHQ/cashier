import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { cashierBackendService } from "../services/cashierBackend";
import { Link, LinkMapper } from "../types/link/link";

// A state for the user tokens list
export const linkListStore = managedState<Link[]>({
  queryFn: async () => {
    const res = await cashierBackendService.getLinks();
    if (res.isErr()) {
      throw res.unwrapErr();
    }
    const links = res.unwrap().map((b) => LinkMapper.fromBackendType(b));
    return links;
  },
  watch: true,
  persistedKey: ["linkList", authState.account?.owner ?? "anon"],
  storageType: "localStorage",
  serde: LinkMapper.serde,
});
