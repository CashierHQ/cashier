import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { SvelteDate, SvelteMap } from "svelte/reactivity";
import { cashierBackendService } from "../services/cashierBackend";
import { Link, LinkMapper } from "../types/link/link";
import type { GroupedLink, UnifiedLinkList } from "../types/linkList";
import { tempLinkRepository } from "../services/tempLinkRepository";

export class LinkListStore {
  readonly #linkListQuery;
  constructor() {
    this.#linkListQuery = managedState<Link[]>({
      queryFn: async () => {
        const res = await cashierBackendService.getLinks();
        if (res.isErr()) {
          throw res.unwrapErr();
        }
        const links = res.unwrap().map((b) => LinkMapper.fromBackendType(b));
        return links;
      },
      refetchInterval: 15 * 1000, // 15 seconds
      persistedKey: ["linkList", authState.account?.owner ?? "anon"],
      storageType: "localStorage",
      serde: LinkMapper.serde,
    });
  }

  /** Get the underlying query state */
  get query() {
    return this.#linkListQuery;
  }

  /**
   * Refreshes the link list data
   */
  refresh() {
    this.#linkListQuery.refresh();
  }

  /**
   * Get all links including both persisted links and temporary links as a unified array
   * @returns UnifiedLinkList of Link and TempLink objects
   */
  getLinks(): UnifiedLinkList {
    const owner = authState.account?.owner;
    const tempLinks = owner ? tempLinkRepository.get(owner) : [];
    return [...(this.query.data ?? []), ...tempLinks];
  }

  /**
   * Groups links by day and sorts them by descending date (most recent first)
   * Supports both persisted links and temporary links
   */
  groupAndSortByDate(): GroupedLink[] {
    const allLinks = this.getLinks();
    const map = new SvelteMap<bigint, UnifiedLinkList>();

    // Group links by day
    for (const link of allLinks) {
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

export const linkListStore = new LinkListStore();
