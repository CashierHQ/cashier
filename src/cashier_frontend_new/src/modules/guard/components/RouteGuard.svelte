<script lang="ts">
  import { draftLinkService } from "$modules/creationLink/services/draftLink";
  import { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
  import { LinkCreationStoreV3 } from "$modules/creationLink/state/linkCreationStoreV3.svelte";
  import {
    CreateLinkAsset,
    CreateLinkData,
  } from "$modules/creationLink/types/createLinkData";
  import { detailLinkService } from "$modules/detailLink/services/detailLink";
  import { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
  import { GuardContext, setGuardContext } from "$modules/guard/context.svelte";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkStep } from "$modules/links/types/linkStep";
  import { TempLink } from "$modules/links/types/tempLink";
  import { UserLinkStoreV3 } from "$modules/useLink/state/userLinkStoreV3.svelte";
  import { LinkState as SharedLinkState } from "$shared";
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
      // TODO: switch version by global config
      //context.setUserLinkStore(new UserLinkStore({ id: linkId }));
      context.setUserLinkStoreV3(new UserLinkStoreV3({ id: linkId }));
    } else if (storeType === "linkDetail") {
      // TODO: switch version by global config
      //context.setLinkDetailStore(new LinkDetailStore({ id: linkId }));
      context.setLinkDetailStoreV3(new LinkDetailStoreV3({ id: linkId }));
    }
  }

  $effect(() => {
    let cancelled = false;
    const commit = (fn: () => void) => {
      queueMicrotask(() => {
        if (!cancelled) fn();
      });
    };

    if (draftLinkId && context.authState.isReady) {
      const draftLink = draftLinkService.getDraftLink(draftLinkId);
      if (draftLink) {
        commit(() => {
          context.setLinkCreationStoreV3(new LinkCreationStoreV3(draftLink));
          context.setHasDraftLinkLoadAttempted(true);
          context.setHasTempLinkLoadAttempted(true);
        });
      } else {
        const tempLinkResult = LinkCreationStore.getTempLink(draftLinkId);
        if (tempLinkResult.isOk()) {
          const tempLink = tempLinkResult.value;
          commit(() => {
            context.setLinkCreationStore(new LinkCreationStore(tempLink));
            context.setHasDraftLinkLoadAttempted(true);
            context.setHasTempLinkLoadAttempted(true);
          });
        } else {
          void (async () => {
            const v3Result = await detailLinkService.fetchLinkDetailV3({
              id: draftLinkId,
              anonymous: false,
            });
            if (cancelled) return;

            if (v3Result.isOk()) {
              const { link, action, icrc112_requests } = v3Result.value;
              if (link.link_state === SharedLinkState.Created) {
                commit(() => {
                  const store = new LinkCreationStoreV3(link);
                  store.backendLink = link;
                  store.backendAction = action;
                  if (icrc112_requests?.length) {
                    store.icrc112Requests = icrc112_requests;
                  }
                  context.setLinkCreationStoreV3(store);
                  context.setHasDraftLinkLoadAttempted(true);
                  context.setHasTempLinkLoadAttempted(true);
                });
                return;
              }
            }

            const v2Result = await detailLinkService.fetchLinkDetail({
              id: draftLinkId,
              anonymous: false,
            });
            if (cancelled) return;

            if (v2Result.isOk()) {
              const payload = v2Result.value;
              const link = payload.link;
              const action = payload.action;
              if (
                link.state === LinkState.CREATE_LINK &&
                action !== undefined &&
                action !== null
              ) {
                commit(() => {
                  const createLinkData = new CreateLinkData({
                    title: link.title,
                    linkType: link.link_type,
                    maxUse: Number(link.link_use_action_max_count),
                    assets: link.asset_info.map(
                      (ai) =>
                        new CreateLinkAsset(
                          ai.asset.address!.toText(),
                          ai.amount_per_link_use_action,
                        ),
                    ),
                  });
                  const tempLink = new TempLink(
                    link.id,
                    link.create_at,
                    LinkState.CREATE_LINK,
                    createLinkData,
                  );
                  const store = new LinkCreationStore(tempLink);
                  store.link = link;
                  store.action = action;
                  context.setLinkCreationStore(store);
                  context.setHasDraftLinkLoadAttempted(true);
                  context.setHasTempLinkLoadAttempted(true);
                });
                return;
              }
            }

            commit(() => {
              const existingV3 = context.linkCreationStoreV3;
              const isInCreatedStateV3 =
                existingV3 &&
                "state" in existingV3 &&
                existingV3.state?.step === LinkStep.CREATED;
              if (!isInCreatedStateV3) {
                context.setLinkCreationStoreV3(null);
              }

              const existing = context.linkCreationStore;
              const isInCreatedState =
                existing &&
                "state" in existing &&
                existing.state?.step === LinkStep.CREATED;
              if (!isInCreatedState) {
                context.setLinkCreationStore(null);
              }

              context.setHasDraftLinkLoadAttempted(true);
              context.setHasTempLinkLoadAttempted(true);
            });
          })();
        }
      }
    } else if (!draftLinkId) {
      context.setHasTempLinkLoadAttempted(true);
      context.setHasDraftLinkLoadAttempted(true);
    }

    return () => {
      cancelled = true;
    };
  });

  setGuardContext(context);
</script>

{@render children()}
