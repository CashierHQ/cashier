<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import {
    ICP_LEDGER_CANISTER_ID,
    ICP_INDEX_CANISTER_ID,
  } from "$modules/token/constants";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { createWalletHistoryStore } from "$modules/token/state/walletHistoryStore.svelte";
  import NavBar from "$modules/token/components/navBar.svelte";
  import { locale } from "$lib/i18n";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import { Clipboard } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import { page } from "$app/state";
  import ConfirmSendDrawer from "../components/confirmSendDrawer.svelte";
  import InputAmount from "$modules/shared/components/InputAmount.svelte";
  import { calculateMaxSendAmount } from "$modules/links/utils/amountCalculator";
  import { walletSendStore } from "../state/walletSendStore.svelte";
  import { ReceiveAddressType, TxState } from "../types/walletSendStore";

  // URL param effect - set token from URL or default to first token
  $effect(() => {
    const tokenParam = page.url.searchParams.get("token");
    if (tokenParam) {
      walletSendStore.setSelectedToken(tokenParam);
    } else if (walletStore.query.data && walletStore.query.data.length > 0) {
      if (!walletSendStore.selectedToken) {
        walletSendStore.setSelectedToken(walletStore.query.data[0].address);
      }
    }
  });

  // Reset receiveType when token changes (non-ICP can't use AccountId)
  $effect(() => {
    if (
      walletSendStore.selectedToken !== ICP_LEDGER_CANISTER_ID &&
      walletSendStore.receiveType === ReceiveAddressType.ACCOUNT_ID
    ) {
      walletSendStore.setReceiveType(ReceiveAddressType.PRINCIPAL);
    }
  });

  // Watch errorMessage and show toast on ERROR state
  $effect(() => {
    if (
      walletSendStore.errorMessage &&
      walletSendStore.txState === TxState.ERROR
    ) {
      toast.error(walletSendStore.errorMessage);
    }
  });

  // Derived values - component specific
  let selectedTokenObj: TokenWithPriceAndBalance | null = $derived.by(() => {
    if (!walletSendStore.selectedToken || !walletStore.query.data) return null;
    const token = walletStore.findTokenByAddress(walletSendStore.selectedToken);
    if (token.isErr()) return null;
    return token.unwrap();
  });

  let maxAmount: number = $derived.by(() => {
    if (!selectedTokenObj || !walletStore.query.data) return 0;

    const maxAmountResult = calculateMaxSendAmount(
      selectedTokenObj.address,
      walletStore.query.data,
    );

    if (maxAmountResult.isErr()) return 0;

    const maxAmountBigInt = maxAmountResult.unwrap();
    return parseBalanceUnits(maxAmountBigInt, selectedTokenObj.decimals);
  });

  let shouldShowAddressTypeSelector: boolean = $derived(
    walletSendStore.selectedToken === ICP_LEDGER_CANISTER_ID,
  );

  const isMaxAvailable = $derived(maxAmount > 0 && !walletSendStore.isSending);
  const isLoading = $derived(
    !walletStore.query.data && walletStore.query.isLoading,
  );

  // Derived from store
  const sendFeeOutput = $derived(walletSendStore.getSendFeeOutput());
  const transactionLink = $derived("https://example.com/transaction");

  /**
   * Resolve indexId for token (ICP uses constant, others use token.indexId)
   */
  function getIndexId(
    address: string,
    tokenObj: TokenWithPriceAndBalance | null,
  ): string | undefined {
    if (address === ICP_LEDGER_CANISTER_ID) {
      return ICP_INDEX_CANISTER_ID;
    }
    return tokenObj?.indexId;
  }

  /**
   * Refresh transaction history for selected token (background, non-blocking)
   */
  function refreshTransactionHistory(): void {
    const indexId = getIndexId(walletSendStore.selectedToken, selectedTokenObj);
    if (!indexId) return;

    const historyStore = createWalletHistoryStore(indexId);
    historyStore.refresh();
  }

  function handleSelectToken(address: string) {
    walletSendStore.setSelectedToken(address);
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      walletSendStore.receiveAddress = text.trim();
      toast.success(locale.t("wallet.send.pasteSuccess"));
    } catch (err) {
      toast.error(locale.t("wallet.send.pasteError") + ": " + err);
    }
  }

  function handleContinue() {
    walletSendStore.prepareSend(maxAmount);
  }

  async function handleConfirmSend() {
    await walletSendStore.executeSend(() => {
      refreshTransactionHistory();
    });
  }

  function handleCloseDrawer() {
    walletSendStore.closeDrawer();
  }
</script>

<NavBar />

<div class="px-4 grow-1 flex flex-col">
  {#if isLoading}
    <div class="text-center py-8">
      <p class="text-gray-500">{locale.t("wallet.loadingMsg")}</p>
    </div>
  {:else if walletStore.query.data}
    <div class="space-y-4 grow-1 flex flex-col">
      {#if walletSendStore.errorMessage}
        <div
          class="p-3 text-sm text-red-700 bg-red-100 rounded border border-red-200"
        >
          {walletSendStore.errorMessage}
        </div>
      {/if}

      <InputAmount
        bind:selectedToken={walletSendStore.selectedToken}
        bind:amount={walletSendStore.amount}
        bind:tokenAmount={walletSendStore.tokenAmount}
        bind:usdAmount={walletSendStore.usdAmount}
        {selectedTokenObj}
        {maxAmount}
        {isMaxAvailable}
        onSelectToken={handleSelectToken}
      />

      <div>
        <label
          for="receive-address-input"
          class="block text-sm font-medium mb-2"
        >
          {locale.t("wallet.send.receiveAddressLabel")}
        </label>

        {#if shouldShowAddressTypeSelector}
          <div class="flex gap-1.5 mb-2">
            <button
              onclick={() => walletSendStore.setReceiveType(ReceiveAddressType.PRINCIPAL)}
              class="flex-1 p-2 border rounded-lg text-sm font-medium transition-colors {walletSendStore.receiveType ===
              ReceiveAddressType.PRINCIPAL
                ? 'border-[#36A18B] bg-green-50'
                : 'border-gray-300 hover:border-gray-400'}"
            >
              {locale.t("wallet.send.principalId")}
            </button>
            <button
              onclick={() => walletSendStore.setReceiveType(ReceiveAddressType.ACCOUNT_ID)}
              class="flex-1 p-2 border rounded-lg text-sm font-medium transition-colors {walletSendStore.receiveType ===
              ReceiveAddressType.ACCOUNT_ID
                ? 'border-[#36A18B] bg-green-50'
                : 'border-gray-300 hover:border-gray-400'}"
            >
              {locale.t("wallet.send.accountId")}
            </button>
          </div>
        {/if}

        <div class="relative">
          <input
            id="receive-address-input"
            type="text"
            bind:value={walletSendStore.receiveAddress}
            class="w-full p-2 pr-24 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green"
            placeholder={locale.t("wallet.send.addressPlaceholder")}
          />
          <button
            onclick={handlePasteFromClipboard}
            class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#36A18B] text-sm font-medium hover:text-[#2d8a75] transition-colors"
          >
            <Clipboard size={16} />
          </button>
        </div>
        <div
          class="text-xs text-gray-500 mt-1 max-w-full whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {locale.t(
            walletSendStore.receiveType === ReceiveAddressType.PRINCIPAL
              ? "wallet.send.addressPrincipleExample"
              : "wallet.send.addressAccountExample",
          )}
        </div>
      </div>

      <div
        class="flex-none w-[95%] mx-auto px-2 sticky bottom-2 left-0 right-0 z-10 mt-auto"
      >
        <Button
          onclick={handleContinue}
          disabled={walletSendStore.isSending}
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
          type="button"
        >
          {locale.t("wallet.send.continueButton")}
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
  {/if}
</div>

<ConfirmSendDrawer
  bind:open={walletSendStore.showConfirmDrawer}
  txState={walletSendStore.txState}
  {sendFeeOutput}
  {transactionLink}
  onClose={handleCloseDrawer}
  onConfirm={handleConfirmSend}
/>
