import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { SvelteDate, SvelteMap } from "svelte/reactivity";
import { cashierBackendService } from "../services/cashierBackend";
import tempLinkService from "../services/tempLinkService";
import { Link, LinkMapper } from "../types/link/link";
import type TempLink from "../types/tempLink";
import type { GroupedLink } from "../types/linkList";

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
// A wrapper class for link list store
export class LinkListStore {
  readonly store = linkListStore;

  /** Get the list of links */
  get links(): Link[] {
    return this.store.data ?? [];
  }

  /**
   * Groups links by day and sorts them by descending date (most recent first)
   */
  groupAndSortByDate(): GroupedLink[] {
    if (!this.links) {
      return [];
    }

    const map = new SvelteMap<bigint, Link[]>();

    // Group links by day
    for (const link of this.links) {
      // derive the day key (midnight local time) from create_at
      const ns = link.create_at;
      const ms = Number(ns / 1000000n);
      const d = new SvelteDate(ms);
      const midnightLocalMs = new SvelteDate(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
      ).getTime();
      const dayKeyNs = BigInt(midnightLocalMs) * 1000000n;
      // key of the day derived from create_at
      const existing = map.get(dayKeyNs);
      if (existing) existing.push(link);
      else map.set(dayKeyNs, [link]);
    }

    // Sort groups by descending day (most recent first)
    return Array.from(map.entries())
      .sort((a, b) => (a[0] === b[0] ? 0 : a[0] > b[0] ? -1 : 1))
      .map(([ns, dateLinks]) => ({ date: ns, links: dateLinks }));
  }
}
