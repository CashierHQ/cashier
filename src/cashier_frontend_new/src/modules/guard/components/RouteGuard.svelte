<script lang="ts">
  import { draftLinkService } from "$modules/creationLink/services/draftLink";
  import { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
  import { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
  import { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import { GuardContext, setGuardContext } from "$modules/guard/context.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { UserLinkStore } from "$modules/useLink/state/userLinkStore.svelte";
  import type { Snippet } from "svelte";

  let {
    linkId,
    draftLinkId,
    storeType,
    children,
  }: {
    linkId?: string;
    draftLinkId?: string;
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
    if (draftLinkId && context.authState.isReady) {
      const draftLink = draftLinkService.getDraftLink(draftLinkId);
      if (draftLink) {
        context.setLinkCreationStoreV3(new LinkCreationStoreV3(draftLink));
      } else {
        // lookup for temp link v2
        const tempLinkResult = LinkCreationStore.getTempLink(draftLinkId);
        if (tempLinkResult.isOk()) {
          context.setLinkCreationStore(
            new LinkCreationStore(tempLinkResult.value),
          );
        } else {
          // Do not clear store when link was successfully created (draft link was deleted)
          const existingV3 = context.linkCreationStoreV3;
          const isInCreatedStateV3 =
            existingV3 &&
            "state" in existingV3 &&
            existingV3.state?.step === LinkStep.CREATED;
          if (!isInCreatedStateV3) {
            context.linkCreationStoreV3 = null;
          }

          // Do not clear store when link was successfully created (temp link was deleted)
          const existing = context.linkCreationStore;
          const isInCreatedState =
            existing &&
            "state" in existing &&
            existing.state?.step === LinkStep.CREATED;
          if (!isInCreatedState) {
            context.linkCreationStore = null;
          }
        }
      }
      context.setHasDraftLinkLoadAttempted(true);
      context.setHasTempLinkLoadAttempted(true);
    } else if (!draftLinkId) {
      context.setHasTempLinkLoadAttempted(true);
      context.setHasDraftLinkLoadAttempted(true);
    }
  });

  setGuardContext(context);
</script>

{@render children()}
