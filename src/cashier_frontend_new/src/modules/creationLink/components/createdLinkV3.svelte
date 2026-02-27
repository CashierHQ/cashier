<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { locale } from "$lib/i18n";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import LinkDetails from "$modules/creationLink/components/linkDetails.svelte";
  import type { LinkCreationStore } from "$modules/creationLink/state/linkCreationStore.svelte";
  import { LinkDetailStoreV3 } from "$modules/detailLink/state/linkDetailStoreV3.svelte";
  import type { ProcessActionResultV3 } from "$modules/detailLink/types/v3/action";
  import { ActionState } from "$modules/links/types/action/actionState";
  import LinkTxCartV3 from "$modules/transactionCart/components/LinkTxCartV3.svelte";
  import { LinkState as SharedLinkState } from "$shared";
  import { onMount } from "svelte";

  const {
    link,
  }: {
    link: LinkCreationStore;
  } = $props();

  let linkDetailStore = $state<LinkDetailStoreV3 | null>(null);
  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let showTxCart: boolean = $state(false);

  function onClickCreate() {
    showTxCart = true;
  }

  function onCloseDrawer() {
    showTxCart = false;
  }

  async function handleProcessAction(): Promise<ProcessActionResultV3> {
    if (!linkDetailStore) {
      throw new Error("LinkDetailStore is not initialized");
    }
    return await linkDetailStore.processAction();
  }

  $effect(() => {
    // Redirect to detail page if the link is active
    if (
      linkDetailStore &&
      linkDetailStore.link &&
      linkDetailStore.link.link_state === SharedLinkState.Active
    ) {
      goto(resolve(`/link/detail/${linkDetailStore.id}?created=true`));
    }
  });

  onMount(() => {
    // Initialize LinkDetailStore with the created link ID
    if (link.id) {
      linkDetailStore = new LinkDetailStoreV3({ id: link.id });
    }

    if (link.action && link.action.state !== ActionState.SUCCESS) {
      showTxCart = true;
    }
  });
</script>

<div class="mt-2 flex flex-col gap-4 grow-1 justify-between">
  <LinkDetails {link} {errorMessage} {successMessage} />
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

{#if showTxCart && linkDetailStore && linkDetailStore.action && linkDetailStore.icrc112Requests}
  <LinkTxCartV3
    bind:isOpen={showTxCart}
    source={{
      action: linkDetailStore.action,
      icrc112Requests: linkDetailStore.icrc112Requests,
      handleProcessAction,
    }}
    {onCloseDrawer}
    onFeeInfoDrawerClose={() => {
      // Reset showTxCart when FeeInfoDrawer is closed via X button
      // This allows the component to be remounted when user clicks Create again
      showTxCart = false;
    }}
  />
{/if}
