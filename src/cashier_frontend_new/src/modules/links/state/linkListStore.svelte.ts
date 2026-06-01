import { managedState } from "$lib/managedState";
import { authState } from "$modules/auth/state/auth.svelte";
import { draftLinkRepository } from "$modules/creationLink/repositories/draftLinkRepository";
import { tempLinkRepository } from "$modules/creationLink/repositories/tempLinkRepository";
import { ONBOARDING_DISMISSED_KEY } from "../constants";
import { cashierBackendService } from "../services/cashierBackend";
import { Link, LinkMapper } from "../types/link/link";
import type { UnifiedLinkList } from "../types/linkList";
import { UnifiedLinkItemMapper } from "../types/linkList";
import { mapV3LinkToFrontend } from "../utils/linkV3Mapper";

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
          console.warn("[links:list] skip fetch: no authenticated owner");
          return [];
        }

        console.warn("[links:list] fetch start", {
          owner: authState.account.owner,
        });

        const [v2Res, v3Res] = await Promise.all([
          cashierBackendService.getLinks(),
          cashierBackendService.getLinksV3(),
        ]);

        console.warn("[links:list] fetch response", {
          owner: authState.account.owner,
          v2: v2Res.isOk()
            ? {
                ok: true,
                links: v2Res.unwrap(),
              }
            : {
                ok: false,
                error: v2Res.unwrapErr(),
              },
          v3: v3Res.isOk()
            ? {
                ok: true,
                result: v3Res.unwrap(),
              }
            : {
                ok: false,
                error: v3Res.unwrapErr(),
              },
        });

        const v2Links: Link[] = v2Res.isOk()
          ? v2Res.unwrap().map((b) => LinkMapper.fromBackendType(b))
          : [];

        const v3Links: Link[] =
          v3Res.isOk() && v3Res.unwrap().data
            ? v3Res.unwrap().data.map(mapV3LinkToFrontend)
            : [];

        console.warn("[links:list] mapped links", {
          owner: authState.account.owner,
          v2Count: v2Links.length,
          v3Count: v3Links.length,
          totalCount: v2Links.length + v3Links.length,
          links: [...v2Links, ...v3Links],
        });

        return [...v2Links, ...v3Links];
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
