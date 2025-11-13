<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import LinkInfoSection from "$modules/detailLink/components/linkInfoSection.svelte";
  import UsageInfoSection from "$modules/detailLink/components/usageInfoSection.svelte";
  import { LinkDetailStore } from "$modules/links/state/linkDetailStore.svelte";
  import { ActionState } from "$modules/links/types/action/actionState";
  import { ActionType } from "$modules/links/types/action/actionType";
  import { LinkState } from "$modules/links/types/link/linkState";
  import TxCart from "$modules/transactionCart/components/txCart.svelte";
  import { ChevronLeft } from "lucide-svelte";

  let { id }: { id: string } = $props();

  let showCopied: boolean = $state(false);

  let showTxCart: boolean = $state(false);

  let linkDetail = new LinkDetailStore({ id });

  $effect(() => {
    if (linkDetail) {
      showTxCart = shouldShowTxCart();
    }
  });

  function shouldShowTxCart(): boolean {
    return !!(
      linkDetail.action && linkDetail.action.state !== ActionState.SUCCESS
    );
  }

  const copyLink = async () => {
    try {
      const linkUrl = `${window.location.origin}/link/${id}`;
      await navigator.clipboard.writeText(linkUrl);
      showCopied = true;
      setTimeout(() => (showCopied = false), 1500);
    } catch (err) {
      console.error("copy failed", err);
    }
  };

  const endLink = async () => {
    try {
      if (!linkDetail.link) throw new Error("Link is missing");
      await linkDetail.disableLink();
    } catch (err) {
      console.error("end link failed", err);
    }
  };

  const createWithdrawAction = async () => {
    try {
      if (!linkDetail.link) {
        throw new Error("Link is missing");
      }

      await linkDetail.createAction(ActionType.WITHDRAW);
    } catch (err) {
      console.error("end link failed", err);
    }
  };

  const goNext = async () => {
    try {
      if (!linkDetail.action) {
        throw new Error("Action is missing");
      }
      await linkDetail.processAction(linkDetail.action.id);
    } catch (err) {
      console.error("withdraw failed", err);
    }
  };

  const onCloseDrawer = () => {
    showTxCart = false;
  };

  const openDrawer = () => {
    showTxCart = true;
  };
</script>

{#if linkDetail.query.isLoading}
  Loading...
{:else if !linkDetail.link}
  Link not found
{:else if linkDetail.query.data && linkDetail.link}
  <div class="px-4 py-4">
    <div class="flex items-center gap-3 mb-4">
      <Button
        variant="outline"
        onclick={() => {
          goto(resolve("/links"));
        }}
        class="p-2 cursor-pointer w-8 h-8 flex items-center justify-center "
      >
        <ChevronLeft />
      </Button>

      <h3 class="text-lg font-semibold flex-1 text-center">
        {linkDetail.link.title}
      </h3>

      <!-- placeholder to keep title centered (matches back button width) -->
      <div class="w-8 h-8" aria-hidden="true"></div>
    </div>

    {#if linkDetail.link}
      <LinkInfoSection link={linkDetail.link} />
      <UsageInfoSection link={linkDetail.link} />
    {/if}

    <div class="mb-20">
      {#if linkDetail.link.state === LinkState.ACTIVE}
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
      {#if linkDetail.link.state === LinkState.INACTIVE}
        <Button
          variant="outline"
          onclick={createWithdrawAction}
          class="w-full h-11 bg-emerald-600 text-white rounded-full cursor-pointer hover:bg-emerald-700 hover:shadow-md hover:font-semibold transition transform hover:-translate-y-0.5"
        >
          Withdraw
        </Button>
      {/if}
      {#if linkDetail.link.state === LinkState.CREATE_LINK}
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

{#if showTxCart && linkDetail.link && linkDetail.action}
  <TxCart
    isOpen={showTxCart}
    link={linkDetail.link}
    action={linkDetail.action}
    {goNext}
    {onCloseDrawer}
  />
{/if}
