<script lang="ts">
  import { draftLinkService } from "$modules/creationLink/services/draftLink";
  import { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
  import { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
  import { GuardContext, setGuardContext } from "$modules/guard/context.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";
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
      context.setUserLinkStoreV3(new UserLinkStoreV3({ id: linkId }));
    } else if (storeType === "linkDetail") {
      context.setLinkDetailStoreV3(new LinkDetailStoreV3({ id: linkId }));
    }
  }

  $effect(() => {
    if (draftLinkId && context.authState.isReady) {
      const draftLink = draftLinkService.getDraftLink(draftLinkId);
      if (draftLink) {
        context.setLinkCreationStoreV3(new LinkCreationStoreV3(draftLink));
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
      }
      context.setHasDraftLinkLoadAttempted(true);
    } else if (!draftLinkId) {
      context.setHasDraftLinkLoadAttempted(true);
    }
  });

  setGuardContext(context);
</script>

{@render children()}
