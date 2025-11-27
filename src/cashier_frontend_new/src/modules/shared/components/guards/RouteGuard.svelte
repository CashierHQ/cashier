<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    RouteGuardContext,
    setRouteGuardContext,
  } from "$modules/shared/contexts/routeGuardContext.svelte";
  import { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import UserLinkStore from "$modules/useLink/state/userLinkStore.svelte";
  import { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
  import GuardRenderer from "./GuardRenderer.svelte";
  import { GuardType, type GuardConfig } from "./types";

  let {
    guards,
    linkId,
    tempLinkId,
    children,
  }: {
    guards: GuardConfig[];
    linkId?: string;
    tempLinkId?: string;
    children: Snippet;
  } = $props();

  const context = new RouteGuardContext();
  context.setGuardCheckComplete(false);

  if (linkId) {
    const hasUserStateGuard = guards.some(
      (g) => g.type === GuardType.USER_STATE,
    );

    if (hasUserStateGuard) {
      context.userLinkStore = new UserLinkStore({ id: linkId });
    } else {
      context.linkDetailStore = new LinkDetailStore({ id: linkId });
    }
  }

  $effect(() => {
    if (tempLinkId && context.authState.isReady) {
      console.log("[RouteGuard] Auth ready, loading tempLinkId:", tempLinkId);
      const tempLinkResult = LinkCreationStore.getTempLink(tempLinkId);
      console.log("[RouteGuard] tempLinkResult:", tempLinkResult);
      if (tempLinkResult.isOk()) {
        const store = new LinkCreationStore(tempLinkResult.value);
        context.linkCreationStore = store;
        console.log("[RouteGuard] Set linkCreationStore:", store);
      } else {
        console.log("[RouteGuard] Failed to get temp link:", tempLinkResult.error);
        context.linkCreationStore = null;
      }
    }
  });

  console.log("[RouteGuard] Context after setup:", {
    linkDetailStore: context.linkDetailStore,
    userLinkStore: context.userLinkStore,
    linkCreationStore: context.linkCreationStore,
  });

  setRouteGuardContext(context);
</script>

<GuardRenderer {guards} index={0}>
  {#if context.isGuardCheckComplete}
    {@render children()}
  {/if}
</GuardRenderer>
