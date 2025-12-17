<script lang="ts">
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import NavBar from "$modules/token/components/navBar.svelte";
  import { locale } from "$lib/i18n";
  import { Copy, Info, ChevronDown, X } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import { page } from "$app/state";
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import { authState } from "$modules/auth/state/auth.svelte";
  import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerClose,
  } from "$lib/shadcn/components/ui/drawer";
  import { Dialog, DialogContent } from "$lib/shadcn/components/ui/dialog";
  import { SvelteSet } from "svelte/reactivity";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";

  let selectedToken: string = $state("");
  let showTokenSelector = $state(false);
  let showAccountIdModal = $state(false);
  let imageLoadFailures = new SvelteSet<string>();

  $effect(() => {
    const tokenParam = page.url.searchParams.get("token");
    if (tokenParam) {
      selectedToken = tokenParam;
    } else if (walletStore.query.data && walletStore.query.data.length > 0) {
      if (!selectedToken) {
        selectedToken = walletStore.query.data[0].address;
      }
    }
  });

  let selectedTokenObj = $derived.by(() => {
    if (!selectedToken || !walletStore.query.data) return null;
    const token = walletStore.findTokenByAddress(selectedToken);
    if (token.isErr()) return null;
    return token.unwrap();
  });

  let shouldShowAddressTypeInfo: boolean = $derived.by(
    () => selectedToken === ICP_LEDGER_CANISTER_ID,
  );

  let principalAddress: string = $derived.by(() => {
    return authState.account?.owner || "";
  });

  let accountIdAddress: string = $derived.by(() => {
    if (selectedToken === ICP_LEDGER_CANISTER_ID) {
      return walletStore.icpAccountID() || "";
    }
    return "";
  });

  const tokenLogo = $derived(
    selectedTokenObj ? getTokenLogo(selectedTokenObj.address) : null,
  );

  function hasImageFailed(address: string): boolean {
    return imageLoadFailures.has(address);
  }

  function handleImageError(address: string) {
    imageLoadFailures.add(address);
  }

  async function handleCopy(addr: string) {
    try {
      await navigator.clipboard.writeText(addr);
      toast.success(locale.t("wallet.receive.copySuccess"));
    } catch {
      toast.error(locale.t("wallet.receive.copyError"));
    }
  }

  function handleSelectToken(address: string) {
    selectedToken = address;
    showTokenSelector = false;
  }

  function handleUseAccountId() {
    showAccountIdModal = true;
  }

  function getWarningText(token: string): string {
    const warningText = locale
      .t("wallet.receive.warning")
      .replace("{{token}}", token);
    const highlighted = locale.t("wallet.receive.warningHighlighted");
    return warningText.replace("{{highlighted}}", highlighted);
  }
</script>

<NavBar />

<div class="px-4 grow-1 flex flex-col">
  {#if walletStore.query.data}
    <div class="space-y-4 grow-1 flex flex-col">
      <!-- Warning Banner -->
      <div class="flex items-start gap-1.5">
        <Info class="h-4 w-4 text-[#36A18B] flex-shrink-0 mt-0.5" />
        <div class="text-sm text-green">
          {#if selectedTokenObj}
            {getWarningText(selectedTokenObj.symbol)}
            <span class="font-semibold"
              >{locale.t("wallet.receive.warningHighlighted")}</span
            >
          {:else}
            {getWarningText("")}
            <span class="font-semibold"
              >{locale.t("wallet.receive.warningHighlighted")}</span
            >
          {/if}
        </div>
      </div>

      <!-- Token Selector -->
      <div class="space-y-2">
        <Label class="text-base font-semibold"
          >{locale.t("wallet.receive.selectTokenLabel")}</Label
        >

        <button
          onclick={() => (showTokenSelector = true)}
          class="w-full flex items-center justify-between py-2 px-3 border border-gray-300 rounded-lg bg-white hover:border-gray-400 transition-colors"
        >
          {#if selectedTokenObj}
            <div class="flex items-center gap-3">
              <div
                class="relative flex shrink-0 overflow-hidden rounded-full w-6 h-6"
              >
                {#if tokenLogo && !hasImageFailed(selectedTokenObj.address)}
                  <img
                    alt={selectedTokenObj.symbol}
                    class="w-full h-full object-cover rounded-full"
                    src={tokenLogo}
                    onerror={() => handleImageError(selectedTokenObj.address)}
                  />
                {:else}
                  <div
                    class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-xs font-medium"
                  >
                    {selectedTokenObj.symbol[0]?.toUpperCase() || "?"}
                  </div>
                {/if}
              </div>
              <span class="font-medium">{selectedTokenObj.symbol}</span>
            </div>
            <ChevronDown class="h-5 w-5 text-gray-400" />
          {:else}
            <span class="text-gray-500"
              >{locale.t("wallet.receive.selectToken")}</span
            >
            <ChevronDown class="h-5 w-5 text-gray-400" />
          {/if}
        </button>
      </div>

      <!-- Address Display -->
      <div class="space-y-2">
        <Label class="text-base font-semibold">
          {#if selectedTokenObj}
            {locale
              .t("wallet.receive.receiveAddressLabel")
              .replace("{{token}}", selectedTokenObj.symbol)}
          {:else}
            {locale
              .t("wallet.receive.receiveAddressLabel")
              .replace("{{token}}", "")}
          {/if}
        </Label>

        <div class="relative">
          <input
            type="text"
            value={principalAddress}
            readonly
            class="w-full p-3 pr-12 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none text-sm font-mono break-all"
          />
          <button
            onclick={() => handleCopy(principalAddress)}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-[#36A18B] hover:text-[#2d8a75] transition-colors"
            title={locale.t("wallet.receive.copyTooltip")}
          >
            <Copy size={20} class="text-[#36A18B]" />
          </button>
        </div>

        {#if shouldShowAddressTypeInfo}
          <div class="text-center">
            <button
              onclick={handleUseAccountId}
              class="text-green hover:text-[#2d8a75] font-medium text-sm transition-colors underline"
            >
              {locale.t("wallet.receive.useAccountId")}
            </button>
          </div>
        {/if}
      </div>

      <div class="flex-grow-1 flex flex-col justify-end items-center">
        <Button
          onclick={() => goto(resolve("/wallet"))}
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
          type="button"
        >
          {locale.t("wallet.receive.closeButton")}
        </Button>
      </div>
    </div>
  {:else if walletStore.query.isSuccess}
    <div class="text-center py-8">
      <p class="text-red-600">{locale.t("wallet.noTokensMsg")}</p>
    </div>
  {:else if walletStore.query.error}
    <div class="text-center py-8">
      <p class="text-red-600">
        {locale.t("wallet.errorMsg")}
        {walletStore.query.error}
      </p>
    </div>
  {:else}
    <div class="text-center py-8">
      <p class="text-gray-500">{locale.t("wallet.loadingMsg")}</p>
    </div>
  {/if}
</div>

<!-- Token Selector Drawer -->
<Drawer bind:open={showTokenSelector}>
  <DrawerContent class="max-w-full w-[400px] mx-auto">
    <DrawerHeader>
      <div class="flex justify-center items-center relative mb-2">
        <DrawerTitle class="text-lg font-semibold">
          {locale.t("wallet.receive.selectToken")}
        </DrawerTitle>
        <DrawerClose>
          <X
            size={24}
            stroke-width={2}
            class="absolute right-2 cursor-pointer top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
            aria-hidden="true"
          />
        </DrawerClose>
      </div>
    </DrawerHeader>

    <div class="px-4 pb-4 max-h-[60vh] overflow-y-auto">
      {#if walletStore.query.data}
        <div class="space-y-2">
          {#each walletStore.query.data as token (token.address)}
            {#if token.enabled}
              <button
                onclick={() => handleSelectToken(token.address)}
                class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors {selectedToken ===
                token.address
                  ? 'bg-green-50 border border-[#36A18B]'
                  : 'border border-transparent'}"
              >
                <div
                  class="relative flex shrink-0 overflow-hidden rounded-full w-10 h-10"
                >
                  {#if getTokenLogo(token.address) && !hasImageFailed(token.address)}
                    <img
                      alt={token.symbol}
                      class="w-full h-full object-cover rounded-full"
                      src={getTokenLogo(token.address)}
                      onerror={() => handleImageError(token.address)}
                    />
                  {:else}
                    <div
                      class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-sm font-medium"
                    >
                      {token.symbol[0]?.toUpperCase() || "?"}
                    </div>
                  {/if}
                </div>
                <span class="font-medium text-left">{token.symbol}</span>
              </button>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </DrawerContent>
</Drawer>

<!-- Account ID Modal -->
<Dialog bind:open={showAccountIdModal}>
  <DialogContent class="max-w-[400px]">
    <div class="space-y-4">
      <p class="text-sm text-gray-700">
        {#if selectedTokenObj}
          {locale
            .t("wallet.receive.icpAddressInfo")
            .replace("{{token}}", selectedTokenObj.symbol)}
        {:else}
          {locale.t("wallet.receive.icpAddressInfo").replace("{{token}}", "")}
        {/if}
      </p>
      <p class="text-sm text-gray-700">
        {locale.t("wallet.receive.icpAddressInfoSecond")}
      </p>

      <div class="flex gap-1.5 text-green items-start">
        <span class="text-sm font-semibold break-all">{accountIdAddress}</span>
        <button
          onclick={() => handleCopy(accountIdAddress)}
          title={locale.t("wallet.receive.copyTooltip")}
          class="flex-shrink-0"
        >
          <Copy size={20} class="text-[#36A18B]" />
        </button>
      </div>
    </div>
  </DialogContent>
</Dialog>
