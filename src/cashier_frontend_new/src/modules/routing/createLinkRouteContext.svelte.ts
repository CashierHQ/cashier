import { draftLinkService } from "$modules/creationLink/services/draftLink";
import { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
import { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
import { GuardContext, setGuardContext } from "$modules/guard/context.svelte";
import { LinkStep } from "$modules/links/types/linkStep";
import { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";

type LinkRouteContextOptions = {
  linkId?: string;
  draftLinkId?: string;
  storeType?: "userLink" | "linkDetail";
};

/**
 * Initializes route-scoped link data and exposes it through Svelte context.
 *
 * This replaces the old UI guard wrapper. It does not decide redirects and it
 * does not render UI. Its only job is to create the stores needed by the real
 * page components and by `buildRedirectInput`.
 *
 * @param options route setup options for owner or public link routes
 * @param options.linkId backend link id for detail/user routes
 * @param options.draftLinkId draft or temporary link id for create routes
 * @param options.storeType which loaded link store should be created
 * @returns the route context used by child components and redirect input
 */
export function createLinkRouteContext({
  linkId,
  draftLinkId,
  storeType,
}: LinkRouteContextOptions): GuardContext {
  const context = new GuardContext();

  if (linkId && storeType === "userLink") {
    context.setUserLinkStoreV3(new UserLinkStoreV3({ id: linkId }));
  }

  if (linkId && storeType === "linkDetail") {
    context.setLinkDetailStoreV3(new LinkDetailStoreV3({ id: linkId }));
  }

  $effect(() => {
    if (draftLinkId && context.authState.isReady) {
      const draftLink = draftLinkService.getDraftLink(draftLinkId);

      if (draftLink) {
        context.setLinkCreationStoreV3(new LinkCreationStoreV3(draftLink));
      } else {
        const tempLinkResult = LinkCreationStore.getTempLink(draftLinkId);

        if (tempLinkResult.isOk()) {
          context.setLinkCreationStore(
            new LinkCreationStore(tempLinkResult.value),
          );
        } else {
          clearMissingDraftStores(context);
        }
      }

      context.setHasDraftLinkLoadAttempted(true);
      context.setHasTempLinkLoadAttempted(true);
      return;
    }

    if (!draftLinkId) {
      context.setHasTempLinkLoadAttempted(true);
      context.setHasDraftLinkLoadAttempted(true);
    }
  });

  return setGuardContext(context);
}

/**
 * Clears missing draft stores unless the create flow has just reached Created.
 *
 * The create flow deletes draft/temp storage once a link is successfully
 * created, so we keep the created state around long enough for redirect policy
 * and UI to settle.
 *
 * @param context route context containing create stores
 */
function clearMissingDraftStores(context: GuardContext) {
  const existingV3 = context.linkCreationStoreV3;
  const isInCreatedStateV3 =
    existingV3 &&
    "state" in existingV3 &&
    existingV3.state?.step === LinkStep.CREATED;

  if (!isInCreatedStateV3) {
    context.linkCreationStoreV3 = null;
  }

  const existing = context.linkCreationStore;
  const isInCreatedState =
    existing && "state" in existing && existing.state?.step === LinkStep.CREATED;

  if (!isInCreatedState) {
    context.linkCreationStore = null;
  }
}
