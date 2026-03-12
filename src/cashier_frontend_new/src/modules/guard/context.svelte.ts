import { authState } from "$modules/auth/state/auth.svelte";
import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
import type { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import type { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
import type { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
import { userProfile } from "$modules/shared/services/userProfile.svelte";
import type { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";
import type { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";
import { getContext, setContext } from "svelte";

const GUARD_CONTEXT_KEY = Symbol("guardContext");

export class GuardContext {
  authState = authState;
  userProfile = userProfile;
  linkDetailStore = $state<LinkDetailStore | null>(null);
  linkDetailStoreV3 = $state<LinkDetailStoreV3 | null>(null);
  userLinkStore = $state<UserLinkStore | null>(null);
  userLinkStoreV3 = $state<UserLinkStoreV3 | null>(null);
  linkCreationStore = $state<LinkCreationStore | null>(null);
  linkCreationStoreV3 = $state<LinkCreationStoreV3 | null>(null);
  // Indicates whether the guard check process has completed
  isGuardCheckComplete = $state(false);
  // Indicates whether an attempt to load a temporary link has been made
  hasTempLinkLoadAttempted = $state(false);
  // Indicates whether an attempt to load a draft link has been made
  hasDraftLinkLoadAttempted = $state(false);

  constructor(config?: {
    linkDetailStore?: LinkDetailStore;
    linkDetailStoreV3?: LinkDetailStoreV3;
    userLinkStore?: UserLinkStore;
    userLinkStoreV3?: UserLinkStoreV3;
    linkCreationStore?: LinkCreationStore;
    linkCreationStoreV3?: LinkCreationStoreV3;
  }) {
    if (config?.linkDetailStore) {
      this.linkDetailStore = config.linkDetailStore;
    }
    if (config?.linkDetailStoreV3) {
      this.linkDetailStoreV3 = config.linkDetailStoreV3;
    }
    if (config?.userLinkStore) {
      this.userLinkStore = config.userLinkStore;
    }
    if (config?.userLinkStoreV3) {
      this.userLinkStoreV3 = config.userLinkStoreV3;
    }
    if (config?.linkCreationStore) {
      this.linkCreationStore = config.linkCreationStore;
    }
    if (config?.linkCreationStoreV3) {
      this.linkCreationStoreV3 = config.linkCreationStoreV3;
    }
  }

  setLinkDetailStore(store: LinkDetailStore) {
    this.linkDetailStore = store;
  }

  setLinkDetailStoreV3(store: LinkDetailStoreV3) {
    this.linkDetailStoreV3 = store;
  }

  setUserLinkStore(store: UserLinkStore) {
    this.userLinkStore = store;
  }

  setUserLinkStoreV3(store: UserLinkStoreV3) {
    this.userLinkStoreV3 = store;
  }

  setLinkCreationStore(store: LinkCreationStore) {
    this.linkCreationStore = store;
  }

  setLinkCreationStoreV3(store: LinkCreationStoreV3) {
    this.linkCreationStoreV3 = store;
  }

  setGuardCheckComplete(complete: boolean) {
    this.isGuardCheckComplete = complete;
  }

  setHasTempLinkLoadAttempted(attempted: boolean) {
    this.hasTempLinkLoadAttempted = attempted;
  }

  setHasDraftLinkLoadAttempted(attempted: boolean) {
    this.hasDraftLinkLoadAttempted = attempted;
  }

  /**
   * Get the first available link store
   * @returns LinkDetailStore | UserLinkStore | LinkCreationStore | LinkCreationStoreV3 | null
   */
  getLinkStore() {
    return (
      this.linkDetailStore ||
      this.linkDetailStoreV3 ||
      this.userLinkStore ||
      this.userLinkStoreV3 ||
      this.linkCreationStore ||
      this.linkCreationStoreV3 ||
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
    if (this.linkDetailStoreV3) {
      return this.linkDetailStoreV3.link;
    }
    if (this.userLinkStore) {
      return this.userLinkStore.link;
    }
    if (this.userLinkStoreV3) {
      return this.userLinkStoreV3.link;
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

    if (this.linkDetailStoreV3) {
      return this.linkDetailStoreV3.query.isLoading;
    }

    if (this.linkDetailStore) {
      return this.linkDetailStore.query.isLoading;
    }

    if (this.userLinkStoreV3) {
      return this.userLinkStoreV3.isLoading;
    }

    if (this.userLinkStore) {
      return this.userLinkStore.isLoading;
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

    if (this.linkCreationStore) return true;
    if (this.linkCreationStoreV3) return true;

    if (this.linkDetailStoreV3) {
      return (
        this.linkDetailStoreV3.link !== null &&
        this.linkDetailStoreV3.link !== undefined
      );
    }

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

    if (this.userLinkStoreV3) {
      return (
        this.userLinkStoreV3.link !== null &&
        this.userLinkStoreV3.link !== undefined
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
