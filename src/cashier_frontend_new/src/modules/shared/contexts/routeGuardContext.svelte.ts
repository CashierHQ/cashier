import { getContext, setContext } from "svelte";
import { authState } from "$modules/auth/state/auth.svelte";
import { userProfile } from "$modules/shared/services/userProfile.svelte";
import type { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
import type { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";
import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";

const ROUTE_GUARD_CONTEXT_KEY = Symbol("routeGuardContext");

export class RouteGuardContext {
  authState = authState;
  userProfile = userProfile;
  linkDetailStore: LinkDetailStore | null = null;
  userLinkStore: UserLinkStore | null = null;
  linkCreationStore: LinkCreationStore | null = null;

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
}

export function setRouteGuardContext(context: RouteGuardContext): RouteGuardContext {
  setContext(ROUTE_GUARD_CONTEXT_KEY, context);
  return context;
}

export function getRouteGuardContext(): RouteGuardContext {
  const context = getContext<RouteGuardContext>(ROUTE_GUARD_CONTEXT_KEY);
  if (!context) {
    throw new Error("RouteGuardContext not found. Make sure RouteGuard component is wrapping this component.");
  }
  return context;
}

