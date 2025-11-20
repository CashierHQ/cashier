<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { LinkDetailStore } from "$modules/detailLink/state/linkDetailStore.svelte";
  import type { ProcessActionResult } from "$modules/links/types/action/action";
  import { LinkState } from "$modules/links/types/link/linkState";
  import { LinkStep } from "$modules/links/types/linkStep";
  import TxCart from "$modules/transactionCart/components/txCart.svelte";
  import { onMount } from "svelte";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";
  import LinkDetails from "./linkDetails.svelte";

  const {
    link,
  }: {
    link: LinkCreationStore;
  } = $props();

  let linkDetailStore = $state<LinkDetailStore | null>(null);
  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let isOpenTxCart = $state(!!link.action);

  async function onClickCreate() {
    isOpenTxCart = true;
  }

  async function onCloseTxCart() {
    isOpenTxCart = false;
  }

  async function handleProcessAction(): Promise<ProcessActionResult> {
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
      linkDetailStore.link.state === LinkState.ACTIVE
    ) {
      goto(resolve(`/link/detail/${linkDetailStore.id}`));
    }
  });

  onMount(() => {
    // Initialize LinkDetailStore with the created link ID
    if (link.id) {
      linkDetailStore = new LinkDetailStore({ id: link.id });
    }
  });
</script>

<h3 class="text-lg font-semibold">Created</h3>
<div class="mt-2">
  <LinkDetails {link} {errorMessage} {successMessage} />

  <Button onclick={onClickCreate}>Create</Button>

  {#if link.link && link.action && isOpenTxCart}
    <TxCart
      isOpen={isOpenTxCart}
      action={link.action}
      onCloseDrawer={onCloseTxCart}
      {handleProcessAction}
    />
  {/if}
</div>
