import { authState } from "$modules/auth/state/auth.svelte";
import type { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import type { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
import { GatingStore } from "$modules/gating/state/gatingStore.svelte";
import { userProfile } from "$modules/shared/services/userProfile.svelte";
import type { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";
import { getContext, setContext } from "svelte";

const ROUTE_CONTEXT_KEY = Symbol("routeContext");

export class RouteContext {
  authState = authState;
  userProfile = userProfile;
  linkDetailStoreV3 = $state<LinkDetailStoreV3 | null>(null);
  userLinkStoreV3 = $state<UserLinkStoreV3 | null>(null);
  linkCreationStoreV3 = $state<LinkCreationStoreV3 | null>(null);
  gatingStore = $state<GatingStore | null>(null);
  // Indicates whether the guard check process has completed
  isGuardCheckComplete = $state(false);
  // Indicates whether an attempt to load a draft link has been made
  hasDraftLinkLoadAttempted = $state(false);

  constructor(config?: {
    linkDetailStoreV3?: LinkDetailStoreV3;
    userLinkStoreV3?: UserLinkStoreV3;
    linkCreationStoreV3?: LinkCreationStoreV3;
  }) {
    if (config?.linkDetailStoreV3) {
      this.linkDetailStoreV3 = config.linkDetailStoreV3;
    }
    if (config?.userLinkStoreV3) {
      this.userLinkStoreV3 = config.userLinkStoreV3;
    }
    if (config?.linkCreationStoreV3) {
      this.linkCreationStoreV3 = config.linkCreationStoreV3;
    }
  }

  setLinkDetailStoreV3(store: LinkDetailStoreV3) {
    this.linkDetailStoreV3 = store;
  }

  setUserLinkStoreV3(store: UserLinkStoreV3) {
    this.userLinkStoreV3 = store;
  }

  setLinkCreationStoreV3(store: LinkCreationStoreV3) {
    this.linkCreationStoreV3 = store;
  }

  setGatingStore(store: GatingStore) {
    this.gatingStore = store;
  }

  setGuardCheckComplete(complete: boolean) {
    this.isGuardCheckComplete = complete;
  }

  setHasDraftLinkLoadAttempted(attempted: boolean) {
    this.hasDraftLinkLoadAttempted = attempted;
  }

  /**
   * Get the first available link store
   * @returns LinkDetailStoreV3 | UserLinkStoreV3 | LinkCreationStoreV3 | null
   */
  getLinkStore() {
    return (
      this.linkDetailStoreV3 ||
      this.userLinkStoreV3 ||
      this.linkCreationStoreV3 ||
      null
    );
  }

  /**
   * Get the link from the first available link store
   * @returns Link | undefined
   */
  getLink() {
    if (this.linkDetailStoreV3) {
      return this.linkDetailStoreV3.link;
    }
    if (this.userLinkStoreV3) {
      return this.userLinkStoreV3.link;
    }
    if (this.linkCreationStoreV3) {
      return this.linkCreationStoreV3.draftLink;
    }
    return undefined;
  }

  /**
   * Check if any link store is loading
   * @param options - Configuration options
   * @param options.checkDraftLinkLoad - If true, returns !hasDraftLinkLoadAttempted when no store exists. If false, returns false.
   * @returns boolean
   */
  isLoading(options?: { checkDraftLinkLoad?: boolean }) {
    const checkDraftLinkLoad = options?.checkDraftLinkLoad ?? true;

    if (this.linkDetailStoreV3) {
      return this.linkDetailStoreV3.query.isLoading;
    }

    if (this.userLinkStoreV3) {
      return this.userLinkStoreV3.isLoading;
    }

    // No store exists
    return checkDraftLinkLoad ? !this.hasDraftLinkLoadAttempted : false;
  }

  /**
   * Check if the current user is the owner of the link
   * @returns boolean
   */
  isOwner() {
    // always return if link creation store exists
    if (this.linkCreationStoreV3) return true;

    // else check ownership for other stores
    if (!this.authState.account) return false;
    const link = this.getLink();
    if (!link?.creator) return false;
    return link.creator.toString() === this.authState.account.owner;
  }

  /**
   * Check if a link exists in the current link store
   * @returns boolean
   */
  hasLink() {
    const store = this.getLinkStore();
    if (!store) return false;

    if (this.linkCreationStoreV3) return true;

    if (this.linkDetailStoreV3) {
      return (
        this.linkDetailStoreV3.link !== null &&
        this.linkDetailStoreV3.link !== undefined
      );
    }

    if (this.userLinkStoreV3) {
      return (
        this.userLinkStoreV3.link !== null &&
        this.userLinkStoreV3.link !== undefined
      );
    }
    return false;
  }
}

export function setRouteContext(context: RouteContext): RouteContext {
  setContext(ROUTE_CONTEXT_KEY, context);
  return context;
}

export function getRouteContext(): RouteContext {
  const context = getContext<RouteContext>(ROUTE_CONTEXT_KEY);
  if (!context) {
    throw new Error(
      "RouteContext not found. Make sure createLinkRouteContext is called by this route.",
    );
  }
  return context;
}
