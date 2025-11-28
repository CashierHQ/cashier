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
  isGuardCheckComplete = $state(false);
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
