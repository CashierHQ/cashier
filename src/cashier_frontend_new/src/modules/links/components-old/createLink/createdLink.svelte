<script lang="ts">
  import { goto } from "$app/navigation";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { resolve } from "$app/paths";
  import LinkDetails from "./linkDetails.svelte";
  import TxCart from "$modules/links/components/txCart/txCart.svelte";
  import { LinkStep } from "$modules/links/types/linkStep";
  import type { LinkCreationStore } from "../state/linkCreationStore.svelte";

  const {
    link,
  }: {
    link: LinkCreationStore;
  } = $props();

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let isOpenTxCart = $state(!!link.action);

  // Redirect if not in the correct step
  $effect(() => {
    if (link.state.step !== LinkStep.CREATED) {
      goto(resolve("/links"));
    }
  });

  // Navigate back to the previous step
  async function goBack() {
    goto(resolve("/links"));
  }

  async function goNext() {
    try {
      if (!link.id) {
        console.error("Missing link.id, cannot navigate");
        return;
      }
      await link.goNext();
      goto(resolve(`/link/detail/${link.id}`));
    } catch (error) {
      console.error("Failed to go next: ", error);
    }
  }

  async function onClickCreate() {
    isOpenTxCart = true;
  }

  async function onCloseTxCart() {
    isOpenTxCart = false;
  }
</script>

<h3 class="text-lg font-semibold">Created</h3>
<div class="mt-2">
  <LinkDetails {link} {errorMessage} {successMessage} />

  <Button onclick={goBack}>Back</Button>

  <Button onclick={onClickCreate}>Create</Button>

  {#if link.link && link.action && isOpenTxCart}
    <TxCart
      isOpen={isOpenTxCart}
      link={link.link}
      action={link.action}
      {goNext}
      onCloseDrawer={onCloseTxCart}
    />
  {/if}
</div>
