import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { draftLinkRepository } from "$modules/creationLink/repositories/draftLinkRepository";
import { ONBOARDING_DISMISSED_KEY } from "$modules/links/constants";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { Link, LinkMapper } from "$modules/links/types/link/link";
import type { UnifiedLinkList } from "$modules/links/types/linkList";
import { UnifiedLinkItemMapper } from "$modules/links/types/linkList";
import { mapV3LinkToFrontend } from "$modules/links/utils/linkV3Mapper";

/** Number of links fetched per page, and the increment used by `loadMore()`. */
const PAGE_SIZE = 100;

/**
 * Store managing the list of links.
 * Fetches persisted links from the V3 API and merges local V3 drafts.
 * Persisted in localStorage, auto-refetched every 15 seconds.
 */
export class LinkListStore {
  #linkListQuery;
  #loadedLinksOwner = $state<string | null>(null);

  /**
   * How many links to request (offset 0, this many) on every fetch.
   * Grows by `PAGE_SIZE` each time `loadMore()` is called, so periodic
   * auto-refreshes keep re-fetching the full set the user has loaded so far
   * instead of snapping back to just the first page.
   */
  #loadedLimit = $state(PAGE_SIZE);

  /** Whether the backend reported more links beyond the currently loaded set. */
  #hasMore = $state(false);

  /** Whether a `loadMore()` call is in flight (distinct from the initial/background load). */
  #isLoadingMore = $state(false);

  /** Persisted state for onboarding dismissal */
  #isOnboardingDismissed = $state(
    typeof localStorage !== "undefined"
      ? localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true"
      : false,
  );
  constructor() {
    this.#linkListQuery = managedState<Link[]>({
      queryFn: async () => {
        const owner = authState.account?.owner;

        if (!owner) {
          this.#loadedLinksOwner = null;
          this.#hasMore = false;
          return [];
        }

        const v3Res = await cashierBackendService.getLinksV3({
          offset: 0,
          limit: this.#loadedLimit,
        });

        const v3Links: Link[] =
          v3Res.isOk() && v3Res.unwrap().data
            ? v3Res.unwrap().data.map(mapV3LinkToFrontend)
            : [];

        this.#hasMore = v3Res.isOk() ? v3Res.unwrap().metadata.is_next : false;
        this.#loadedLinksOwner = owner;

        return v3Links;
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
          this.#loadedLinksOwner = null;
          this.#loadedLimit = PAGE_SIZE;
          this.#hasMore = false;
          this.#linkListQuery.reset();
          return;
        }
        // Refresh the data when user logs in
        this.#linkListQuery.refresh();
      });
    });
  }

  /** Whether the backend has more links beyond the currently loaded page(s). */
  get hasMore(): boolean {
    return this.#hasMore;
  }

  /** Whether a `loadMore()` call is currently in flight. */
  get isLoadingMore(): boolean {
    return this.#isLoadingMore;
  }

  /**
   * Loads the next page of links, appending to what's already loaded.
   * No-ops if there's nothing more to load or a load is already in flight.
   */
  async loadMore(): Promise<void> {
    if (this.#isLoadingMore || !this.#hasMore) return;

    this.#isLoadingMore = true;
    this.#loadedLimit += PAGE_SIZE;
    try {
      await this.#linkListQuery.refreshAsync();
    } finally {
      this.#isLoadingMore = false;
    }
  }

  /** Get the underlying query state */
  get query() {
    return this.#linkListQuery;
  }

  get isLoadingInitialPersistedLinks() {
    const owner = authState.account?.owner;

    if (!owner) return false;

    return (
      this.#linkListQuery.isLoading &&
      this.#loadedLinksOwner !== owner &&
      (this.#linkListQuery.data ?? []).length === 0
    );
  }

  /**
   * Refreshes the link list data
   */
  refresh() {
    this.#linkListQuery.refresh();
  }

  /** Whether onboarding has been dismissed */
  get isOnboardingDismissed() {
    return this.#isOnboardingDismissed;
  }

  /** Dismiss onboarding and persist to localStorage */
  dismissOnboarding() {
    this.#isOnboardingDismissed = true;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    }
  }

  /**
   * Get all persisted links and local draft links as a unified array.
   * @returns UnifiedLinkList of persisted and draft link objects.
   */
  getLinks(): UnifiedLinkList {
    const owner = authState.account?.owner;
    const draftLinks = owner ? draftLinkRepository.get(owner) : [];
    const persisted = (this.query.data ?? []).map((l) =>
      UnifiedLinkItemMapper.fromLink(l),
    );
    const drafts = (draftLinks || []).map((d) =>
      UnifiedLinkItemMapper.fromDraftLink(d),
    );
    return [...persisted, ...drafts];
  }
}

export const linkListStore = new LinkListStore();
