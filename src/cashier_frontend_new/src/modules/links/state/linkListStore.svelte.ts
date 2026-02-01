import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { cashierBackendService } from "../services/cashierBackend";
import { Link, LinkMapper } from "../types/link/link";
import type { UnifiedLinkList } from "../types/linkList";
import { UnifiedLinkItemMapper } from "../types/linkList";
import { tempLinkRepository } from "$modules/creationLink/repositories/tempLinkRepository";

/**
 * Store managing the list of links
 * This is persisted in localStorage and auto-refetched every 15 seconds
 * Clear on logout/login to avoid data leakage between users
 */
export class LinkListStore {
  #linkListQuery;
  constructor() {
    this.#linkListQuery = managedState<Link[]>({
      queryFn: async () => {
        if (!authState.account?.owner) {
          return [];
        }

        const res = await cashierBackendService.getLinks();
        if (res.isErr()) {
          throw res.unwrapErr();
        }
        const links = res.unwrap().map((b) => LinkMapper.fromBackendType(b));
        return links;
      },
      watch: [() => authState.account],
      refetchInterval: 15 * 1000, // 15 seconds
      persistedKey: ["linkList"],
      storageType: "localStorage",
      serde: LinkMapper.serde,
    });

    // Auto refresh/reset based on auth state changes
    $effect.root(() => {
      $effect(() => {
        // Reset the data when user logs out
        if (authState.account == null) {
          this.#linkListQuery.reset();
          return;
        }
        // Refresh the data when user logs in
        this.#linkListQuery.refresh();
      });
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
}

export const linkListStore = new LinkListStore();
