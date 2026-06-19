<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { locale } from "$lib/i18n";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import {
      AnalyticsEvent,
      trackEvent,
  } from "$modules/analytics/amplitudeStore";
  import LinkDetails from "$modules/creationLink/components/linkDetails.svelte";
  import type { AddAssetVM } from "$modules/creationLink/types/viewModels/addAssetVM";
  import type { GenericCreationLinkStoreVM } from "$modules/creationLink/types/viewModels/genericCreationLinkStoreVM";
  import type {
      GenericDetailStoreVM,
      ProcessActionResult,
  } from "$modules/detailLink/types/genericDetailStoreVM";
  import type { GatingStore } from "$modules/gating/state/gatingStore.svelte";
  import { ActionState } from "$modules/links/types/action/actionState";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { paths } from "$modules/routing/paths";
  import LinkTxCart from "$modules/transactionCart/components/LinkTxCart.svelte";
  import { onMount } from "svelte";

  const {
    link,
    detailStore,
    gatingStore,
  }: {
    link: GenericCreationLinkStoreVM & AddAssetVM;
    detailStore: GenericDetailStoreVM;
    gatingStore?: GatingStore;
  } = $props();

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let showTxCart: boolean = $state(false);

  function onClickCreate() {
    showTxCart = true;
  }

  function onCloseDrawer() {
    showTxCart = false;
  }

  async function handleProcessAction(): Promise<ProcessActionResult> {
    return await detailStore.processAction();
  }

  $effect(() => {
    // Redirect to detail page if the link is active
    if (
      link.backendId &&
      detailStore &&
      detailStore.state === LinkState.ACTIVE
    ) {
      trackEvent(AnalyticsEvent.LINK_CREATION_CREATE_ACTION_SUCCESS, {
        link_type: link.createLinkData.linkType,
        BE_link_id: link.backendId ?? "",
      });
      goto(resolve(paths.createdDetail(link.backendId)));
    }
  });

  onMount(() => {
    if (link.action && link.action.state !== ActionState.SUCCESS) {
      trackEvent(AnalyticsEvent.LINK_CREATION_CREATE_LANDING, {
        link_type: link.createLinkData.linkType,
        BE_link_id: link.backendId ?? "",
      });

      showTxCart = true;
    }
  });
</script>

<div class="mt-2 flex flex-col gap-4 grow-1 justify-between">
  <LinkDetails {link} {errorMessage} {successMessage} {gatingStore} />
  <div
    class="flex-none w-[95%] mx-auto px-2 sticky bottom-2 left-0 right-0 z-10 mt-auto"
  >
    <Button
      class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
      type="button"
      onclick={onClickCreate}
    >
      {locale.t("links.linkForm.detail.create")}
    </Button>
  </div>
</div>

{#if showTxCart && detailStore && detailStore.action}
  <LinkTxCart
    bind:isOpen={showTxCart}
    source={{
      action: detailStore.action,
      maxUse: link.maxUse,
      handleProcessAction,
    }}
    showProgressBanner={true}
    {onCloseDrawer}
    onFeeInfoDrawerClose={() => {
      // Reset showTxCart when FeeInfoDrawer is closed via X button
      // This allows the component to be remounted when user clicks Create again
      showTxCart = false;
    }}
  />
{/if}
