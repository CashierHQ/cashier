<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import LinkInfoSection from "$modules/detailLink/components/linkInfoSection.svelte";
  import UsageInfoSection from "$modules/detailLink/components/usageInfoSection.svelte";
  import type { ProcessActionResult } from "$modules/links/types/action/action";
  import { ActionState } from "$modules/links/types/action/actionState";
  import { ActionType } from "$modules/links/types/action/actionType";
  import { LinkState } from "$modules/links/types/link/linkState";
  import TxCart from "$modules/transactionCart/components/txCart.svelte";
  import { LinkDetailStore } from '../state/linkDetailStore.svelte';

  //let { linkStore }: { linkStore: LinkDetailStore } = $props();
  let { id }: { id: string } = $props();

  let linkStore = new LinkDetailStore({ id });

  let showCopied: boolean = $state(false);
  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let showTxCart: boolean = $state(false);

  async function copyLink() {
    try {
      const linkUrl = `${window.location.origin}/link/${linkStore.link?.id}`;
      await navigator.clipboard.writeText(linkUrl);
      showCopied = true;
      setTimeout(() => (showCopied = false), 1500);
    } catch (err) {
      console.error("copy failed", err);
    }
  }

  async function endLink() {
    errorMessage = null;
    successMessage = null;

    try {
      if (!linkStore.link) throw new Error("Link is missing");
      await linkStore.disableLink();
      successMessage = "Link ended successfully.";
    } catch (err) {
      errorMessage =
        "Failed to end link." + (err instanceof Error ? err.message : "");
    }
  }

  function onCloseDrawer() {
    showTxCart = false;
  }

  function openDrawer() {
    showTxCart = true;
  }

  async function createWithdrawAction() {
    errorMessage = null;

    try {
      if (!linkStore.link) {
        throw new Error("Link is missing");
      }

      await linkStore.createAction(ActionType.WITHDRAW);
    } catch (err) {
      errorMessage =
        "Failed to create withdraw action." +
        (err instanceof Error ? err.message : "");
    }
  }

  async function handleProcessAction(): Promise<ProcessActionResult> {
    return await linkStore.processAction();
  };

  $effect(() => {
    if (linkStore && linkStore.action && linkStore.action.state !== ActionState.SUCCESS) {
      showTxCart = true;
    }
  });
</script>

{#if linkStore.query.isLoading}
  Loading...
{:else if !linkStore.link}
  <!-- `DetailFlowProtected` will redirect to /links when link is missing. Show a fallback while redirect occurs. -->
  Loading...
{:else if linkStore.query.data && linkStore.link}
  <div>
    {#if errorMessage}
      <div
        class="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded border border-red-200"
      >
        {errorMessage}
      </div>
    {/if}

    {#if successMessage}
      <div
        class="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded border border-green-200"
      >
        {successMessage}
      </div>
    {/if}

    {#if linkStore.link}
      <LinkInfoSection link={linkStore.link} />
      <UsageInfoSection link={linkStore.link} />
    {/if}

    <div class="mb-20">
      {#if linkStore.link.state === LinkState.ACTIVE}
        <Button
          variant="outline"
          onclick={endLink}
          class="w-full h-11 border border-red-200 text-red-600 rounded-full mb-3 cursor-pointer hover:bg-red-50 hover:text-red-700 hover:border-red-400 hover:font-semibold transition-colors"
        >
          End link
        </Button>
        <Button
          id="copy-link-button"
          onclick={copyLink}
          class="w-full h-11 bg-emerald-600 text-white rounded-full cursor-pointer hover:bg-emerald-700 hover:shadow-md hover:font-semibold transition transform hover:-translate-y-0.5"
        >
          {showCopied ? "Copied" : "Copy link"}
        </Button>
      {/if}
      {#if linkStore.link.state === LinkState.INACTIVE}
        <Button
          variant="outline"
          onclick={createWithdrawAction}
          class="w-full h-11 bg-emerald-600 text-white rounded-full cursor-pointer hover:bg-emerald-700 hover:shadow-md hover:font-semibold transition transform hover:-translate-y-0.5"
        >
          Withdraw
        </Button>
      {/if}
      {#if linkStore.link.state === LinkState.CREATE_LINK}
        <Button
          variant="outline"
          onclick={openDrawer}
          class="w-full h-11 bg-emerald-600 text-white rounded-full cursor-pointer hover:bg-emerald-700 hover:shadow-md hover:font-semibold transition transform hover:-translate-y-0.5"
        >
          Create
        </Button>
      {/if}
    </div>
  </div>
{/if}

{#if showTxCart && linkStore.action}
  <TxCart
    isOpen={showTxCart}
    action={linkStore.action}
    {onCloseDrawer}
    {handleProcessAction}
  />
{/if}
