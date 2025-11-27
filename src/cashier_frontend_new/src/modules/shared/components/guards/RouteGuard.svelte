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

  if (linkId) {
    const hasUserStateGuard = guards.some(
      (g) => g.type === GuardType.USER_STATE,
    );

    if (hasUserStateGuard) {
      context.setUserLinkStore(new UserLinkStore({ id: linkId }));
    } else {
      context.setLinkDetailStore(new LinkDetailStore({ id: linkId }));
    }
  }

  if (tempLinkId) {
    const tempLinkResult = LinkCreationStore.getTempLink(tempLinkId);
    if (tempLinkResult.isOk()) {
      context.setLinkCreationStore(new LinkCreationStore(tempLinkResult.value));
    }
  }

  setRouteGuardContext(context);
</script>

<GuardRenderer {guards} index={0}>
  {@render children()}
</GuardRenderer>
