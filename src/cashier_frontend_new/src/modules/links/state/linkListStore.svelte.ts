import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { cashierBackendService } from "../services/cashierBackend";
import tempLinkService from "../services/tempLinkService";
import { Link, LinkMapper } from "../types/link/link";
import type TempLink from "../types/tempLink";

// A state for the user tokens list
export const linkListStore = managedState<Array<Link>>({
  queryFn: async () => {
    const res = await cashierBackendService.getLinks();
    if (res.isErr()) {
      throw res.unwrapErr();
    }
    const links = res.unwrap().map((b) => LinkMapper.fromBackendType(b));

    // Return combined array: backend links first, then temp links.
    return [...links];
  },
  watch: [() => authState.account?.owner],
  refetchInterval: 15 * 1000, // 15 seconds
  persistedKey: ["linkList", authState.account?.owner ?? "anon"],
  storageType: "localStorage",
  serde: LinkMapper.serde,
});

// Aggregator to combine backend links and temporary links
export class AggregatorLinkList {
  #linkListStore;

  constructor() {
    this.#linkListStore = linkListStore;
  }

  /**
   * Get combined list of links from backend and temporary links
   * @returns array of Link and TempLink objects
   */
  links(): Array<Link | TempLink> {
    const tempLinks: TempLink[] = tempLinkService.get(authState.account?.owner);
    return [...(this.#linkListStore.data ?? []), ...tempLinks];
  }
}
