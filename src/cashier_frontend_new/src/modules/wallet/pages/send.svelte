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
  import { Clipboard, Info } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import ConfirmSendDrawer from "../components/confirmSendDrawer.svelte";
  import InputAmount from "$modules/shared/components/InputAmount.svelte";
  import { calculateMaxSendAmount } from "$modules/links/utils/amountCalculator";
  import { TxState } from "$modules/wallet/types/walletSendStore";
  import { walletSendStore } from "$modules/wallet/state/walletSendStore.svelte";
  import { ReceiveAddressType } from "$modules/wallet/types";

  type Props = {
    initialToken?: string;
    onNavigateBack: () => void;
  };

  let { initialToken, onNavigateBack }: Props = $props();

  // Form state (local)
  let selectedToken = $state("");
  let receiveAddress = $state("");
  let amount = $state(0);
  let tokenAmount = $state("");
  let usdAmount = $state("");

  // UI state (local)
  let receiveType = $state<ReceiveAddressType>(ReceiveAddressType.PRINCIPAL);
  let showConfirmDrawer = $state(false);
  let isSending = $state(false);
  let lastBlockId = $state<bigint | null>(null);

  // URL param effect - set token from URL or default to first token
  $effect(() => {
    if (initialToken) {
      selectedToken = initialToken;
    } else if (walletStore.query.data && walletStore.query.data.length > 0) {
      if (!selectedToken) {
        selectedToken = walletStore.query.data[0].address;
      }
    }
  });

  // Reset receiveType when token changes (non-ICP can't use AccountId)
  $effect(() => {
    if (
      selectedToken !== ICP_LEDGER_CANISTER_ID &&
      receiveType === ReceiveAddressType.ACCOUNT_ID
    ) {
      receiveType = ReceiveAddressType.PRINCIPAL;
    }
  });

  // Derived values - component specific
  let selectedTokenObj: TokenWithPriceAndBalance | null = $derived.by(() => {
    if (!selectedToken || !walletStore.query.data) return null;
    const token = walletStore.findTokenByAddress(selectedToken);
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
    selectedToken === ICP_LEDGER_CANISTER_ID,
  );

  const isMaxAvailable = $derived(maxAmount > 0 && !isSending);
  const isLoading = $derived(
    !walletStore.query.data && walletStore.query.isLoading,
  );

  // Derived from store methods
  const sendFeeResult = $derived.by(() => {
    return walletSendStore.computeSendFee({
      selectedToken,
      amount,
      receiveAddress,
    });
  });
  const sendFeeOutput = $derived.by(() => {
    return sendFeeResult.isOk() ? sendFeeResult.value : null;
  });

  const transactionLink = $derived.by(() => {
    return lastBlockId !== null
      ? walletSendStore.getTransactionLink(selectedToken, lastBlockId)
      : null;
  });

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
    const indexId = getIndexId(selectedToken, selectedTokenObj);
    if (!indexId) return;

    const historyStore = createWalletHistoryStore(indexId);
    historyStore.refresh();
  }

  function handleSelectToken(address: string) {
    selectedToken = address;
  }

  function handleSetReceiveTypePrincipal() {
    receiveType = ReceiveAddressType.PRINCIPAL;
  }

  function handleSetReceiveTypeAccountId() {
    receiveType = ReceiveAddressType.ACCOUNT_ID;
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      receiveAddress = text.trim();
      toast.success(locale.t("wallet.send.pasteSuccess"));
    } catch (err) {
      toast.error(locale.t("wallet.send.pasteError") + ": " + err);
    }
  }

  function handleContinue() {
    const result = walletSendStore.validateSend({
      selectedToken,
      receiveAddress,
      amount,
      receiveType,
      maxAmount,
    });
    if (result.isErr()) {
      toast.error(result.error);
    } else {
      walletSendStore.txState = TxState.CONFIRM;
      showConfirmDrawer = true;
    }
  }

  async function handleConfirmSend() {
    walletSendStore.txState = TxState.PENDING;
    isSending = true;

    const result = await walletSendStore.executeSend({
      selectedToken,
      receiveAddress,
      amount,
      receiveType,
    });

    if (result.isOk()) {
      lastBlockId = result.value;
      walletSendStore.txState = TxState.SUCCESS;
      refreshTransactionHistory();
    } else {
      walletSendStore.txState = TxState.ERROR;
      showConfirmDrawer = false;
      toast.error(result.error);
    }

    isSending = false;
  }

  function handleCloseDrawer() {
    showConfirmDrawer = false;
    if (walletSendStore.txState === TxState.SUCCESS) {
      // Reset form
      receiveAddress = "";
      amount = 0;
      tokenAmount = "";
      usdAmount = "";
    }
    walletSendStore.txState = TxState.CONFIRM;
  }
</script>

<NavBar
  mode="back-only"
  title={locale.t("wallet.send.header")}
  onBack={onNavigateBack}
/>

<div class="px-4 grow-1 flex flex-col">
  {#if isLoading}
    <div class="text-center py-8">
      <p class="text-gray-500">{locale.t("wallet.loadingMsg")}</p>
    </div>
  {:else if walletStore.query.data}
    <div class="space-y-4 grow-1 flex flex-col">
      <InputAmount
        bind:selectedToken
        bind:amount
        bind:tokenAmount
        bind:usdAmount
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
              onclick={handleSetReceiveTypePrincipal}
              class="flex-1 p-2 border rounded-lg text-sm font-medium transition-colors {receiveType ===
              ReceiveAddressType.PRINCIPAL
                ? 'border-[#36A18B] bg-green-50'
                : 'border-gray-300 hover:border-gray-400'}"
            >
              {locale.t("wallet.send.principalId")}
            </button>
            <button
              onclick={handleSetReceiveTypeAccountId}
              class="flex-1 p-2 border rounded-lg text-sm font-medium transition-colors {receiveType ===
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
            bind:value={receiveAddress}
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
            receiveType === ReceiveAddressType.PRINCIPAL
              ? "wallet.send.addressPrincipleExample"
              : "wallet.send.addressAccountExample",
          )}
        </div>
        {#if receiveType === ReceiveAddressType.PRINCIPAL && shouldShowAddressTypeSelector}
          <div class="flex items-start gap-1.5 mt-2">
            <Info class="h-4 w-4 text-[#36A18B] flex-shrink-0 mt-0.5" />
            <div class="text-sm text-green">
              {locale.t("wallet.send.principleIdInfoText")}
            </div>
          </div>
        {/if}
      </div>

      <div
        class="flex-none w-[95%] mx-auto px-2 sticky bottom-2 left-0 right-0 z-10 mt-auto"
      >
        <Button
          onclick={handleContinue}
          disabled={isSending}
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
  bind:open={showConfirmDrawer}
  txState={walletSendStore.txState}
  {sendFeeOutput}
  {transactionLink}
  onClose={handleCloseDrawer}
  onConfirm={handleConfirmSend}
/>
