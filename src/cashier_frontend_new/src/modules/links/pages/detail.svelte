<script lang="ts">
  import { ActionType } from "../types/action/actionType";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { ChevronLeft } from "lucide-svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { cashierBackendService } from "../services/cashierBackend";
  import TxCart from "../components/txCart/txCart.svelte";
  import LinkInfoSection from "../components/linkDetail/linkInfoSection.svelte";
  import UsageInfoSection from "../components/linkDetail/usageInfoSection.svelte";
  import { LinkState } from "../types/link/linkState";
  import { linkDetailStore } from "../state/linkDetailStore.svelte";
  import { LinkStore } from "../state/linkStore.svelte";

  let showCopied: boolean = $state(false);

  let { id }: { id: string } = $props();

  // query for link data (used for loading/refresh) and a local store for view-model
  const linkQueryState = linkDetailStore(id, ActionType.Withdraw);
  let link = $state(new LinkStore());

  $effect(() => {
    if (linkQueryState?.data?.link) {
      link.from(linkQueryState?.data?.link, linkQueryState?.data?.action);
    }
  });

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
      if (!linkQueryState || !linkQueryState.data) return;
      await link.goNext();
      linkQueryState.refresh();
    } catch (err) {
      console.error("end link failed", err);
    }
  };

  const createWithdrawAction = async () => {
    try {
      if (!link.id) throw new Error("Link ID is missing");
      const actionRes = await cashierBackendService.createActionV2({
        linkId: link.id,
        actionType: ActionType.Withdraw,
      });

      if (actionRes.isErr()) {
        throw actionRes.error;
      }
      linkQueryState.refresh();
    } catch (err) {
      console.error("end link failed", err);
    }
  };

  const withdraw = async () => {
    try {
      await link.goNext();
      linkQueryState.refresh();
    } catch (err) {
      console.error("withdraw failed", err);
    }
  };
</script>

{#if linkQueryState.isLoading}
  Loading...
{/if}
{#if link.link}
  <div class="px-4 py-4">
    <div class="flex items-center gap-3 mb-4">
      <Button
        variant="outline"
        onclick={() => {
          goto(resolve("/"));
        }}
        class="p-2 cursor-pointer w-8 h-8 flex items-center justify-center "
      >
        <ChevronLeft />
      </Button>

      <h3 class="text-lg font-semibold flex-1 text-center">
        {link.link.title}
      </h3>

      <!-- placeholder to keep title centered (matches back button width) -->
      <div class="w-8 h-8" aria-hidden="true"></div>
    </div>

    {#if linkQueryState.data?.link}
      <LinkInfoSection link={linkQueryState.data.link} />

      <UsageInfoSection link={linkQueryState.data.link} />
    {/if}

    <div class="mb-20">
      {#if link.link.state === LinkState.ACTIVE}
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
      {#if link.link.state === LinkState.INACTIVE}
        <Button
          variant="outline"
          onclick={createWithdrawAction}
          class="w-full h-11 bg-emerald-600 text-white rounded-full cursor-pointer hover:bg-emerald-700 hover:shadow-md hover:font-semibold transition transform hover:-translate-y-0.5"
        >
          Withdraw
        </Button>
      {/if}
    </div>
  </div>
{/if}

{#if link.link?.state !== LinkState.INACTIVE_ENDED}
  <TxCart {link} goNext={withdraw} />
{/if}
