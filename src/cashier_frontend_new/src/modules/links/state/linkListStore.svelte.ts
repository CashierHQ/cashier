import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { draftLinkRepository } from "$modules/creationLink/repositories/draftLinkRepository";
import { tempLinkRepository } from "$modules/creationLink/repositories/tempLinkRepository";
import { ONBOARDING_DISMISSED_KEY } from "$modules/links/constants";
import { cashierBackendService } from "$modules/links/services/cashierBackend";
import { Link, LinkMapper } from "$modules/links/types/link/link";
import type { UnifiedLinkList } from "$modules/links/types/linkList";
import { UnifiedLinkItemMapper } from "$modules/links/types/linkList";
import { mapV3LinkToFrontend } from "$modules/links/utils/linkV3Mapper";

/**
 * Store managing the list of links.
 * Fetches from both V2 API (standard links) and V3 API (TIP_SHARED_TEST etc.)
 * to show all user links in a unified list.
 * Persisted in localStorage, auto-refetched every 15 seconds.
 */
export class LinkListStore {
  #linkListQuery;

  /** Persisted state for onboarding dismissal */
  #isOnboardingDismissed = $state(
    typeof localStorage !== "undefined"
      ? localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true"
      : false,
  );
  constructor() {
    this.#linkListQuery = managedState<Link[]>({
      queryFn: async () => {
        if (!authState.account?.owner) {
          return [];
        }

        const [v2Res, v3Res] = await Promise.all([
          cashierBackendService.getLinks(),
          cashierBackendService.getLinksV3(),
        ]);

        const v2Links: Link[] = v2Res.isOk()
          ? v2Res.unwrap().map((b) => LinkMapper.fromBackendType(b))
          : [];

        const v3Links: Link[] =
          v3Res.isOk() && v3Res.unwrap().data
            ? v3Res.unwrap().data.map(mapV3LinkToFrontend)
            : [];

        return [...v2Links, ...v3Links];
      },
      watch: [() => authState.account],
      staleTime: 120_000,
      refetchInterval: 120_000, // 2 min — every refetch is a wallet ICRC-49 roundtrip; keep sparse
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
   * Get all links including both persisted links and temporary links as a unified array
   * @returns UnifiedLinkList of Link and TempLink objects
   */
  getLinks(): UnifiedLinkList {
    const owner = authState.account?.owner;
    const tempLinks = owner ? tempLinkRepository.get(owner) : [];
    const draftLinks = owner ? draftLinkRepository.get(owner) : [];
    const persisted = (this.query.data ?? []).map((l) =>
      UnifiedLinkItemMapper.fromLink(l),
    );
    const temps = (tempLinks || []).map((t) =>
      UnifiedLinkItemMapper.fromTempLink(t),
    );
    const drafts = (draftLinks || []).map((d) =>
      UnifiedLinkItemMapper.fromDraftLink(d),
    );
    return [...persisted, ...drafts, ...temps];
  }
}

export const linkListStore = new LinkListStore();
