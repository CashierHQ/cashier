import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { draftLinkRepository } from "$modules/creationLink/repositories/draftLinkRepository";
import { ONBOARDING_DISMISSED_KEY } from "$modules/links/constants";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { Link, LinkMapper } from "$modules/links/types/link/link";
import type { UnifiedLinkList } from "$modules/links/types/linkList";
import { UnifiedLinkItemMapper } from "$modules/links/types/linkList";
import { mapV3LinkToFrontend } from "$modules/links/utils/linkV3Mapper";

/**
 * Store managing the list of links.
 * Fetches persisted links from the V3 API and merges local V3 drafts.
 * Persisted in localStorage, auto-refetched every 15 seconds.
 */
export class LinkListStore {
  #linkListQuery;
  #loadedLinksOwner = $state<string | null>(null);

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
          return [];
        }

        const v3Res = await cashierBackendService.getLinksV3();

        const v3Links: Link[] =
          v3Res.isOk() && v3Res.unwrap().data
            ? v3Res.unwrap().data.map(mapV3LinkToFrontend)
            : [];

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
