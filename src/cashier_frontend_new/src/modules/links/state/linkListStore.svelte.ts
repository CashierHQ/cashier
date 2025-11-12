import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { cashierBackendService } from "../services/cashierBackend";
import { Link, LinkMapper } from "../types/link/link";
import type { UnifiedLinkList } from "../types/linkList";
import { UnifiedLinkItemMapper } from "../types/linkList";
import { tempLinkRepository } from "$modules/creationLink/repositories/tempLinkRepository";

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
    const persisted = (this.query.data ?? []).map((l) =>
      UnifiedLinkItemMapper.fromLink(l),
    );
    const temps = (tempLinks || []).map((t) =>
      UnifiedLinkItemMapper.fromTempLink(t),
    );
    return [...persisted, ...temps];
  }

  /**
   * Groups links by day and sorts them by descending date (most recent first)
   * Supports both persisted links and temporary links
   */
  // groupAndSortByDate moved to utils/groupAndSortByDate.ts as a pure helper
}

export const linkListStore = new LinkListStore();
