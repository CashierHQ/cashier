<script lang="ts">
  import type { Snippet } from "svelte";
  import { GuardContext, setGuardContext } from "../context.svelte";
  import { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";
  import { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";

  let {
    linkId,
    tempLinkId,
    storeType,
    children,
  }: {
    linkId?: string;
    tempLinkId?: string;
    storeType?: "userLink" | "linkDetail";
    children: Snippet;
  } = $props();

  const context = new GuardContext();

  if (linkId) {
    if (storeType === "userLink") {
      context.setUserLinkStore(new UserLinkStore({ id: linkId }));
    } else if (storeType === "linkDetail") {
      context.setLinkDetailStore(new LinkDetailStore({ id: linkId }));
    }
  }

  $effect(() => {
    if (tempLinkId && context.authState.isReady) {
      const tempLinkResult = LinkCreationStore.getTempLink(tempLinkId);
      if (tempLinkResult.isOk()) {
        context.setLinkCreationStore(
          new LinkCreationStore(tempLinkResult.value),
        );
        context.setHasTempLinkLoadAttempted(true);
      } else {
        // Temp link not found - if the link is in Transfer Pending state,
        // we redirect to detail flow, so this logic is unnecessary
        context.setHasTempLinkLoadAttempted(true);
      }
    } else if (!tempLinkId) {
      context.setHasTempLinkLoadAttempted(true);
    }
  });

  setGuardContext(context);
</script>

{@render children()}
