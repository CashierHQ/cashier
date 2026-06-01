import { draftLinkService } from "$modules/creationLink/services/draftLink";
import { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
import { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
import { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
import { GatingStore } from "$modules/gating/state/gatingStore.svelte";
import { LinkStep } from "$modules/links/types/linkStep";
import { RouteContext, setRouteContext } from "$modules/routing/routeContext.svelte";
import { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";

type LinkRouteContextOptions = {
  linkId?: string;
  draftLinkId?: string;
  storeType?: "userLink" | "linkDetail";
};

function debugCreateRouteContext(
  message: string,
  data: Record<string, unknown> = {},
) {
  if (import.meta.env.DEV) {
    console.warn(`[route-context:create] ${message}`, data);
  }
}

/**
 * Initializes route-scoped link data and exposes it through Svelte context.
 *
 * This does not decide redirects and it does not render UI. Its only job is to
 * create the stores needed by the real page components and by
 * `buildRedirectInput`.
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
}: LinkRouteContextOptions): RouteContext {
  const context = new RouteContext();

  if (linkId && storeType === "userLink") {
    context.setUserLinkStoreV3(new UserLinkStoreV3({ id: linkId }));
  }

  if (linkId && storeType === "linkDetail") {
    context.setLinkDetailStoreV3(new LinkDetailStoreV3({ id: linkId }));
  }

  $effect(() => {
    if (draftLinkId && context.authState.isReady) {
      debugCreateRouteContext("load draft link", {
        draftLinkId,
        isAuthReady: context.authState.isReady,
      });

      const draftLink = draftLinkService.getDraftLink(draftLinkId);

      if (draftLink) {
        debugCreateRouteContext("found draft link", {
          draftLinkId,
          draftLinkState: draftLink.link_state,
          draftStep: draftLink.draft_step,
          draftGates: draftLink.draft_gates,
        });

        const store = new LinkCreationStoreV3(draftLink);
        context.setLinkCreationStoreV3(store);
        context.gatingStore = new GatingStore(
          draftLink.draft_gates,
          (draftGates) => {
            draftLinkService.update({
              id: draftLinkId,
              updateData: { draftGates },
              owner: context.authState.account?.owner ?? "anon",
            });
          },
        );

        debugCreateRouteContext("created v3 store", {
          draftLinkId,
          storeStep: store.state.step,
          hasLocks: context.gatingStore.hasLocks,
        });
      } else {
        debugCreateRouteContext("missing v3 draft link, checking temp link", {
          draftLinkId,
        });

        const tempLinkResult = LinkCreationStore.getTempLink(draftLinkId);

        if (tempLinkResult.isOk()) {
          debugCreateRouteContext("found temp link", {
            draftLinkId,
            tempLinkState: tempLinkResult.value.state,
          });

          context.gatingStore = new GatingStore();
          context.setLinkCreationStore(
            new LinkCreationStore(tempLinkResult.value),
          );
        } else {
          debugCreateRouteContext("missing all create link stores", {
            draftLinkId,
          });

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

  return setRouteContext(context);
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
function clearMissingDraftStores(context: RouteContext) {
  context.gatingStore = null;

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
