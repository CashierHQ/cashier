<script lang="ts">
  import { locale } from "$lib/i18n";
  import PrimaryActionButton from "$modules/shared/components/PrimaryActionButton.svelte";
  import { Dialog, DialogContent } from "$lib/shadcn/components/ui/dialog";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import { authState } from "$modules/auth/state/auth.svelte";
  import ReceiveBTC from "$modules/bitcoin/components/receiveBTC.svelte";
  import ReceiveRunes from "$modules/bitcoin/components/receiveRunes.svelte";
  import TokenSelectorDrawer from "$modules/creationLink/components/shared/TokenSelectorDrawer.svelte";
  import { TokenIcon } from "$modules/imageCache";
  import { transformShortAddress } from "$modules/shared/utils/transformShortAddress";
  import NavBar from "$modules/token/components/navBar.svelte";
  import {
    CKBTC_CANISTER_ID,
    ICP_LEDGER_CANISTER_ID,
  } from "$modules/token/constants";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import {
    Bitcoin,
    ChevronDown,
    Copy,
    Hourglass,
    Info,
    LayoutList,
  } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import { SvelteSet } from "svelte/reactivity";

  type Props = {
    initialToken?: string;
    onNavigateBack: () => void;
  };

  let { initialToken, onNavigateBack }: Props = $props();

  let selectedToken: string = $state("");
  let showTokenSelector = $state(false);
  let showAccountIdModal = $state(false);
  let imageLoadFailures = new SvelteSet<string>();

  $effect(() => {
    if (initialToken) {
      selectedToken = initialToken;
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

  let shouldShowAddressTypeInfo = $derived(
    selectedToken === ICP_LEDGER_CANISTER_ID,
  );

  let principalAddress: string = $derived(authState.account?.owner || "");

  const shortenedPrincipalAddress = $derived(
    transformShortAddress(principalAddress),
  );

  let accountIdAddress: string = $derived(
    selectedToken === ICP_LEDGER_CANISTER_ID
      ? walletStore.icpAccountID() || ""
      : "",
  );

  const isCkBtc = $derived(selectedToken === CKBTC_CANISTER_ID);
  const isRune = $derived(
    !!selectedTokenObj?.isRune && !!selectedTokenObj?.runeInfo,
  );
  const isBridgeToken = $derived(isCkBtc || isRune);

  const runeIcpAddressLabel = $derived.by(() => {
    if (!selectedTokenObj) return "";
    return locale
      .t("wallet.receive.runeIcpAddressLabel")
      .replace("{{symbol}}", selectedTokenObj.symbol);
  });

  const runeIcpWarning1 = $derived.by(() => {
    if (!selectedTokenObj) return "";
    return locale
      .t("bitcoin.receive.icpAddress.runeWarning1")
      .replace("{{symbol}}", selectedTokenObj.symbol);
  });

  const runeIcpWarning2 = $derived.by(() => {
    if (!selectedTokenObj) return "";
    return locale
      .t("bitcoin.receive.icpAddress.runeWarning2")
      .replace("{{symbol}}", selectedTokenObj.symbol);
  });

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

<NavBar
  mode="back-only"
  title={locale.t("wallet.receive.header")}
  onBack={onNavigateBack}
/>

<div class="grow-1 flex flex-col -mx-4">
  {#if walletStore.query.data}
    <div class="space-y-4 grow-1 flex flex-col">
      {#if !isBridgeToken}
        <div class="flex items-start gap-1.5 px-8">
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
      {/if}

      <div class="space-y-2 px-8">
        <Label class="text-small font-medium"
          >{locale.t("wallet.receive.selectTokenLabel")}</Label
        >

        <button
          onclick={() => (showTokenSelector = true)}
          class="w-full flex items-center justify-between py-2 px-3 border border-gray-300 rounded-lg bg-white hover:border-gray-400 transition-colors"
        >
          {#if selectedTokenObj}
            <div class="flex items-center gap-3">
              <TokenIcon
                address={selectedTokenObj.address}
                symbol={selectedTokenObj.symbol}
                logo={selectedTokenObj.runeInfo?.icon}
                size="sm"
                failedImageLoads={imageLoadFailures}
                onImageError={handleImageError}
                class="rounded-full"
              />
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

      <div class="space-y-2 px-8">
        <Label class="text-small font-medium">
          {#if isCkBtc}
            {locale.t("wallet.receive.ckBtcIcpAddressLabel")}
          {:else if isRune}
            {runeIcpAddressLabel}
          {:else if selectedTokenObj}
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
            value={shortenedPrincipalAddress}
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
        <div
          class="text-xs text-grey mt-1 max-w-full whitespace-nowrap overflow-hidden text-ellipsis"
          class:mb-3={isBridgeToken}
        >
          {#if isBridgeToken}
            {locale.t("wallet.send.addressPrincipleExample")}
          {/if}
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
        {#if isCkBtc}
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center gap-1.5">
              <LayoutList class="h-3 w-3 text-[#36A18B] flex-shrink-0" />
              <div
                class="text-[10px] text-green whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {locale.t("bitcoin.receive.icpAddress.warning1")}
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <Bitcoin class="h-3 w-3 text-[#36A18B] flex-shrink-0" />
              <div
                class="text-[10px] text-green whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {locale.t("bitcoin.receive.icpAddress.warning2")}
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <Hourglass class="h-3 w-3 text-[#36A18B] flex-shrink-0" />
              <div
                class="text-[10px] text-green whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {locale.t("bitcoin.receive.icpAddress.warning3")}
              </div>
            </div>
          </div>
        {:else if isRune}
          <div class="flex flex-col gap-1.5">
            <div class="flex items-start gap-1.5">
              <LayoutList class="h-3 w-3 text-[#36A18B] flex-shrink-0 mt-0.5" />
              <div class="text-[10px] text-green">
                {runeIcpWarning1}
              </div>
            </div>
            <div class="flex items-start gap-1.5">
              <Bitcoin class="h-3 w-3 text-[#36A18B] flex-shrink-0 mt-0.5" />
              <div class="text-[10px] text-green">
                {runeIcpWarning2}
              </div>
            </div>
            <div class="flex items-start gap-1.5">
              <Hourglass class="h-3 w-3 text-[#36A18B] flex-shrink-0 mt-0.5" />
              <div class="text-[10px] text-green">
                {locale.t("bitcoin.receive.icpAddress.warning3")}
              </div>
            </div>
          </div>
        {/if}
      </div>

      {#if selectedToken === CKBTC_CANISTER_ID}
        <ReceiveBTC tokenSymbol={selectedTokenObj?.symbol} />
      {:else if selectedTokenObj?.isRune}
        <ReceiveRunes token={selectedTokenObj} />
      {/if}

      <div
        class="flex-none w-[95%] mx-auto px-2 sticky bottom-2 left-0 right-0 z-10 mt-auto"
      >
        <PrimaryActionButton onclick={onNavigateBack} type="button">
          {locale.t("wallet.receive.closeButton")}
        </PrimaryActionButton>
      </div>
    </div>
  {:else if walletStore.query.isSuccess}
    <div class="text-center py-8 px-4">
      <p class="text-red-600">{locale.t("wallet.noTokensMsg")}</p>
    </div>
  {:else if walletStore.query.error}
    <div class="text-center py-8 px-4">
      <p class="text-red-600">
        {locale.t("wallet.errorMsg")}
        {walletStore.query.error}
      </p>
    </div>
  {:else}
    <div class="text-center py-8 px-4">
      <p class="text-gray-500">{locale.t("wallet.loadingMsg")}</p>
    </div>
  {/if}
</div>

<TokenSelectorDrawer
  bind:open={showTokenSelector}
  selectedAddress={selectedToken}
  onSelectToken={handleSelectToken}
/>

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
