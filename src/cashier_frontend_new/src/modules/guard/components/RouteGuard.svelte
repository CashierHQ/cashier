<script lang="ts">
  import type { Snippet } from "svelte";
  import { GuardContext, setGuardContext } from "../context.svelte";
  import { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";
  import { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
  import { detailLinkService } from "$modules/detailLink/services/detailLink";
  import { LinkState } from "$modules/links/types/link/linkState";

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
        // Temp link not found - might be Transfer Pending (temp link was deleted)
        // Try to load from backend
        void (async () => {
          try {
            const linkDetail = await detailLinkService.fetchLinkDetail({
              id: tempLinkId,
              anonymous: !context.authState.isLoggedIn,
            });
            if (
              linkDetail.isOk() &&
              linkDetail.value.link.state === LinkState.CREATE_LINK
            ) {
              // It's Transfer Pending - create LinkDetailStore
              context.setLinkDetailStore(
                new LinkDetailStore({ id: tempLinkId }),
              );
            }
          } catch (e) {
            // Link doesn't exist in backend either
            console.error("Link not found in backend:", e);
          } finally {
            context.setHasTempLinkLoadAttempted(true);
          }
        })();
      }
    } else if (!tempLinkId) {
      context.setHasTempLinkLoadAttempted(true);
    }
  });

  setGuardContext(context);
</script>

{@render children()}
