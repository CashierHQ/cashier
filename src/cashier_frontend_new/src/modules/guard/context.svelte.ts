import { getContext, setContext } from "svelte";
import { authState } from "$modules/auth/state/auth.svelte";
import { userProfile } from "$modules/shared/services/userProfile.svelte";
import type { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
import type { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";
import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";

const GUARD_CONTEXT_KEY = Symbol("guardContext");

export class GuardContext {
  authState = authState;
  userProfile = userProfile;
  linkDetailStore = $state<LinkDetailStore | null>(null);
  userLinkStore = $state<UserLinkStore | null>(null);
  linkCreationStore = $state<LinkCreationStore | null>(null);
  // Indicates whether the guard check process has completed
  isGuardCheckComplete = $state(false);
  // Indicates whether an attempt to load a temporary link has been made
  hasTempLinkLoadAttempted = $state(false);

  constructor(config?: {
    linkDetailStore?: LinkDetailStore;
    userLinkStore?: UserLinkStore;
    linkCreationStore?: LinkCreationStore;
  }) {
    if (config?.linkDetailStore) {
      this.linkDetailStore = config.linkDetailStore;
    }
    if (config?.userLinkStore) {
      this.userLinkStore = config.userLinkStore;
    }
    if (config?.linkCreationStore) {
      this.linkCreationStore = config.linkCreationStore;
    }
  }

  setLinkDetailStore(store: LinkDetailStore) {
    this.linkDetailStore = store;
  }

  setUserLinkStore(store: UserLinkStore) {
    this.userLinkStore = store;
  }

  setLinkCreationStore(store: LinkCreationStore) {
    this.linkCreationStore = store;
  }

  setGuardCheckComplete(complete: boolean) {
    this.isGuardCheckComplete = complete;
  }

  setHasTempLinkLoadAttempted(attempted: boolean) {
    this.hasTempLinkLoadAttempted = attempted;
  }

  /**
   * Get the first available link store
   * @returns LinkDetailStore | UserLinkStore | LinkCreationStore | null
   */
  getLinkStore() {
    return (
      this.linkDetailStore ||
      this.userLinkStore ||
      this.linkCreationStore ||
      null
    );
  }

  /**
   * Get the link from the first available link store
   * @returns Link | undefined
   */
  getLink() {
    if (this.linkDetailStore) {
      return this.linkDetailStore.link;
    }
    if (this.userLinkStore) {
      return this.userLinkStore.link;
    }
    if (this.linkCreationStore) {
      return this.linkCreationStore.link;
    }
    return undefined;
  }

  /**
   * Check if any link store is loading
   * @param options - Configuration options
   * @param options.checkTempLinkLoad - If true, returns !hasTempLinkLoadAttempted when no store exists. If false, returns false.
   * @returns boolean
   */
  isLoading(options?: { checkTempLinkLoad?: boolean }) {
    const checkTempLinkLoad = options?.checkTempLinkLoad ?? true;

    if (this.linkDetailStore) {
      return this.linkDetailStore.query.isLoading;
    }

    if (this.userLinkStore) {
      return this.userLinkStore.linkDetail?.query?.isLoading ?? false;
    }

    if (this.linkCreationStore) {
      return checkTempLinkLoad ? !this.hasTempLinkLoadAttempted : false;
    }

    // No store exists
    return checkTempLinkLoad ? !this.hasTempLinkLoadAttempted : false;
  }

  /**
   * Check if the current user is the owner of the link
   * @returns boolean
   */
  isOwner() {
    // always return if link creation store exists
    if (this.linkCreationStore) return true;

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

    if (this.linkCreationStore) return true;

    if (this.linkDetailStore) {
      return (
        this.linkDetailStore.link !== null &&
        this.linkDetailStore.link !== undefined
      );
    }

    if (this.userLinkStore) {
      return (
        this.userLinkStore.link !== null &&
        this.userLinkStore.link !== undefined
      );
    }
    return false;
  }
}

export function setGuardContext(context: GuardContext): GuardContext {
  setContext(GUARD_CONTEXT_KEY, context);
  return context;
}

export function getGuardContext(): GuardContext {
  const context = getContext<GuardContext>(GUARD_CONTEXT_KEY);
  if (!context) {
    throw new Error(
      "GuardContext not found. Make sure RouteGuard component is wrapping this component.",
    );
  }
  return context;
}
