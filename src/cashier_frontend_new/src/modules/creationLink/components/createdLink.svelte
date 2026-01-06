<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import type { ProcessActionResult } from "$modules/links/types/action/action";
  import { ActionState } from "$modules/links/types/action/actionState";
  import { LinkState } from "$modules/links/types/link/linkState";
  import TxCart from "$modules/transactionCart/components/txCart.svelte";
  import { onMount } from "svelte";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import LinkDetails from "./linkDetails.svelte";
  import { locale } from "$lib/i18n";
  const {
    link,
  }: {
    link: LinkCreationStore | LinkDetailStore;
  } = $props();

  // Check if link is LinkDetailStore (for Transfer Pending)
  const isLinkDetailStore = link instanceof LinkDetailStore;

  let linkDetailStore = $state<LinkDetailStore | null>(
    isLinkDetailStore ? (link as LinkDetailStore) : null,
  );
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
    if (!linkDetailStore) {
      throw new Error("LinkDetailStore is not initialized");
    }
    const result = await linkDetailStore.processAction();

    // After successful processAction for CREATE_LINK, the link becomes ACTIVE
    // We can redirect immediately - the new page will load the correct state
    if (result.isSuccess) {
      const linkId = linkDetailStore.id;
      // Redirect immediately after successful processAction
      // The link is now ACTIVE on the backend, even if refresh() hasn't completed yet
      goto(resolve(`/link/detail/${linkId}?created=true`), {
        invalidateAll: true,
      });
    }

    return result;
  }

  $effect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // Redirect to detail page if the link is active
    if (
      linkDetailStore &&
      linkDetailStore.link &&
      linkDetailStore.link.state === LinkState.ACTIVE &&
      !linkDetailStore.query.isLoading
    ) {
      const linkId = linkDetailStore.id;
      // Use setTimeout to ensure the redirect happens after state updates
      // and before ProtectedLinkState checks the state
      timeoutId = setTimeout(() => {
        goto(resolve(`/link/detail/${linkId}?created=true`), {
          invalidateAll: true,
        });
      }, 100);
    }

    // Auto-open modal for Transfer Pending (CREATE_LINK) links
    if (
      linkDetailStore &&
      linkDetailStore.link &&
      linkDetailStore.link.state === LinkState.CREATE_LINK &&
      linkDetailStore.action &&
      !linkDetailStore.query.isLoading
    ) {
      showTxCart = true;
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  });

  onMount(() => {
    // If link is LinkDetailStore, use it directly
    if (isLinkDetailStore) {
      linkDetailStore = link as LinkDetailStore;
    } else {
      // Initialize LinkDetailStore with the created link ID from LinkCreationStore
      const linkCreationStore = link as LinkCreationStore;
      if (linkCreationStore.id) {
        linkDetailStore = new LinkDetailStore({ id: linkCreationStore.id });
      }

      if (
        linkCreationStore.action &&
        linkCreationStore.action.state !== ActionState.SUCCESS
      ) {
        showTxCart = true;
      }
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

{#if showTxCart && linkDetailStore && linkDetailStore.action}
  <TxCart
    isOpen={showTxCart}
    action={linkDetailStore.action}
    {onCloseDrawer}
    {handleProcessAction}
  />
{/if}
