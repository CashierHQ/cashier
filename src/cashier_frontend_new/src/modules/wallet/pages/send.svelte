<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import {
    parseBalanceUnits,
    formatBalanceUnits,
  } from "$modules/shared/utils/converter";
  import {
    ICP_LEDGER_CANISTER_ID,
    ICP_INDEX_CANISTER_ID,
    CKBTC_CANISTER_ID,
  } from "$modules/token/constants";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { getWalletHistoryStore } from "$modules/token/state/walletHistoryStore.svelte";
  import NavBar from "$modules/token/components/navBar.svelte";
  import { locale } from "$lib/i18n";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import {
    ArrowLeftRight,
    Bitcoin,
    Clipboard,
    Coins,
    Hourglass,
    Info,
    LayoutList,
  } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import WalletTxCart from "$modules/transactionCart/components/WalletTxCart.svelte";
  import InputAmount from "$modules/shared/components/InputAmount.svelte";
  import { calculateMaxSendAmount } from "$modules/links/utils/amountCalculator";
  import { walletSendStore } from "$modules/wallet/state/walletSendStore.svelte";
  import { ReceiveAddressType } from "$modules/wallet/types";
  import { authState } from "$modules/auth/state/auth.svelte";
  import { CASHIER_WALLET_ID } from "$modules/shared/constants";
  import { WalletTxCartStore } from "$modules/transactionCart/state/walletTxCartStore.svelte";
  import { Principal } from "@dfinity/principal";
  import BridgeTxCart from "$modules/transactionCart/components/BridgeTxCart.svelte";
  import type {
    BridgeSource,
    WalletSource,
  } from "$modules/transactionCart/types/transactionSource";
  import { ckBTCMinterService } from "$modules/bitcoin/services/ckBTCMinterService";
  import { tokenStorageService } from "$modules/token/services/tokenStorage";
  import { bridgeStore } from "$modules/bitcoin/state/bridgeStore.svelte";
  import SendBTC from "$modules/bitcoin/components/sendBTC.svelte";

  type Props = {
    initialToken?: string;
    onNavigateBack: () => void;
  };

  let { initialToken, onNavigateBack }: Props = $props();

  // Form state (local)
  let selectedToken = $state("");
  let receiveAddress = $state("");
  let nativeBtcAddress = $state("");
  let amount = $state(0);
  let tokenAmount = $state("");
  let usdAmount = $state("");

  // UI state (local)
  let receiveType = $state<ReceiveAddressType>(ReceiveAddressType.PRINCIPAL);
  let showConfirmDrawer = $state(false);
  let isSending = $state(false);

  const isStandaloneWallet = $derived(
    authState.connectedWalletId === CASHIER_WALLET_ID,
  );
  let lastBlockId = $state<bigint | null>(null);
  let bridgeSource = $state<BridgeSource | null>(null);
  let isCreatingExportBridge = $state(false);

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
    selectedToken === ICP_LEDGER_CANISTER_ID &&
      selectedToken !== CKBTC_CANISTER_ID,
  );

  const isCkBtc = $derived(selectedToken === CKBTC_CANISTER_ID);

  const isMaxAvailable = $derived(maxAmount > 0);
  const isLoading = $derived(
    !walletStore.query.data && walletStore.query.isLoading,
  );

  // Build WalletSource from form state for txCart
  const walletSource = $derived.by((): WalletSource | null => {
    if (!selectedTokenObj || !receiveAddress || amount <= 0) return null;

    let to: Principal | string;

    try {
      if (receiveType === ReceiveAddressType.ACCOUNT_ID) {
        to = receiveAddress;
      } else {
        to = Principal.fromText(receiveAddress);
      }
    } catch {
      return null; // Invalid address format
    }

    const amountBigInt = formatBalanceUnits(amount, selectedTokenObj.decimals);

    return {
      token: {
        name: selectedTokenObj.name,
        symbol: selectedTokenObj.symbol,
        address: selectedTokenObj.address,
        decimals: selectedTokenObj.decimals,
        enabled: selectedTokenObj.enabled,
        fee: selectedTokenObj.fee,
        is_default: selectedTokenObj.is_default,
        indexId: selectedTokenObj.indexId,
      },
      to,
      amount: amountBigInt,
      receiveType,
    };
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

    const historyStore = getWalletHistoryStore(indexId);
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

  async function handlePasteIntoField(target: "icp" | "btc") {
    try {
      const text = await navigator.clipboard.readText();
      if (target === "btc") {
        nativeBtcAddress = text.trim();
      } else {
        receiveAddress = text.trim();
      }
      toast.success(locale.t("wallet.send.pasteSuccess"));
    } catch (err) {
      toast.error(locale.t("wallet.send.pasteError") + ": " + err);
    }
  }

  async function handleContinue() {
    if (isCreatingExportBridge) {
      return;
    }

    if (isCkBtc && receiveAddress.trim() && nativeBtcAddress.trim()) {
      toast.error(locale.t("wallet.send.errors.chooseOneCkBtcDestination"));
      return;
    }

    if (isCkBtc && nativeBtcAddress.trim()) {
      const result = walletSendStore.validateSend({
        selectedToken,
        receiveAddress: nativeBtcAddress,
        amount,
        receiveType,
        maxAmount,
        isBitcoinAddress: true,
      });
      if (result.isErr()) {
        toast.error(result.error);
      } else {
        await handleCreateExportBridge();
      }
      return;
    }

    const result = walletSendStore.validateSend({
      selectedToken,
      receiveAddress,
      amount,
      receiveType,
      maxAmount,
      isBitcoinAddress: false,
    });
    if (result.isErr()) {
      toast.error(result.error);
    } else if (isStandaloneWallet) {
      await executeDirectly();
    } else {
      showConfirmDrawer = true;
    }
  }

  async function handleCreateExportBridge() {
    if (!selectedTokenObj || amount <= 0) {
      return;
    }

    const amountBigInt = formatBalanceUnits(amount, selectedTokenObj.decimals);
    isCreatingExportBridge = true;
    try {
      const minterInfo = await ckBTCMinterService.getMinterInfo();
      if (amountBigInt < minterInfo.retrieve_btc_min_amount) {
        const minAmount = parseBalanceUnits(
          minterInfo.retrieve_btc_min_amount,
          selectedTokenObj.decimals,
        ).toFixed(selectedTokenObj.decimals);
        toast.error(
          locale
            .t("wallet.send.errors.amountBelowWithdrawalMin")
            .replace("{{min}}", minAmount),
        );
        return;
      }

      const withdrawalFee =
        await ckBTCMinterService.getWithdrawalFee(amountBigInt);
      const totalDebit =
        amountBigInt + withdrawalFee.minter_fee + withdrawalFee.bitcoin_fee;
      const maxAmountResult = calculateMaxSendAmount(
        selectedTokenObj.address,
        walletStore.query.data ?? [],
      );

      if (maxAmountResult.isErr() || totalDebit > maxAmountResult.unwrap()) {
        toast.error(locale.t("wallet.send.errors.amountExceedsWithdrawalMax"));
        return;
      }

      const createResult =
        await tokenStorageService.createExportBridgeTransaction(
          nativeBtcAddress.trim(),
          amountBigInt,
          withdrawalFee.minter_fee,
          withdrawalFee.bitcoin_fee,
        );

      if (createResult.isErr()) {
        toast.error(createResult.unwrapErr());
        return;
      }

      bridgeSource = {
        bridge: createResult.unwrap(),
      };
      showConfirmDrawer = true;
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      isCreatingExportBridge = false;
    }
  }

  /**
   * Handle successful transaction from txCart
   * For WalletSource, result is always bigint (block index)
   */
  function handleTxSuccess(result: bigint) {
    lastBlockId = result;
    // Refresh wallet balance and transaction history
    walletStore.query.refresh();
    refreshTransactionHistory();
    toast.success(locale.t("wallet.send.successMessage"));
  }

  async function executeDirectly() {
    if (!walletSource) return;
    isSending = true;
    try {
      const store = new WalletTxCartStore(walletSource);
      await store.initialize();
      const result = await store.execute();
      if (result.isOk()) {
        handleTxSuccess(result.unwrap());
      } else {
        toast.error(result.unwrapErr());
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      isSending = false;
    }
  }

  function handleCloseDrawer() {
    showConfirmDrawer = false;
    if (lastBlockId !== null || bridgeSource !== null) {
      // Reset form after successful send
      receiveAddress = "";
      nativeBtcAddress = "";
      amount = 0;
      tokenAmount = "";
      usdAmount = "";
      lastBlockId = null;
      bridgeSource = null;
      void bridgeStore.fetchBtcAddress();
    }
  }
</script>

<NavBar
  mode="back-only"
  title={locale.t("wallet.send.header")}
  onBack={onNavigateBack}
/>

<div class="-mx-4 grow-1 flex flex-col">
  {#if isLoading}
    <div class="text-center py-8 px-8">
      <p class="text-gray-500">{locale.t("wallet.loadingMsg")}</p>
    </div>
  {:else if walletStore.query.data}
    <div class="space-y-4 grow-1 flex flex-col">
      <div class="px-8">
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
      </div>
      <div class="px-8">
        <label
          for="receive-address-input"
          class="block text-sm font-medium mb-2"
        >
          {isCkBtc
            ? locale.t("wallet.send.ckbtcIcpAddressLabel")
            : locale.t("wallet.send.receiveAddressLabel")}
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
            onclick={() => handlePasteIntoField("icp")}
            class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#36A18B] text-sm font-medium hover:text-[#2d8a75] transition-colors"
          >
            <Clipboard size={16} />
          </button>
        </div>
        <div
          class="text-xs text-grey mt-1.5 mb-4 max-w-full whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {#if isCkBtc}
            {locale.t("wallet.send.addressPrincipleExample")}
          {:else}
            {locale.t(
              receiveType === ReceiveAddressType.PRINCIPAL
                ? "wallet.send.addressPrincipleExample"
                : "wallet.send.addressAccountExample",
            )}
          {/if}
        </div>
        {#if isCkBtc}
          <div class="flex flex-col gap-1.5 mt-2 bg-lightg">
            <div class="flex items-center gap-1.5">
              <LayoutList class="h-3 w-3 text-[#36A18B] flex-shrink-0" />
              <div
                class="text-[10px] text-green whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {locale.t("bitcoin.send.icpAddress.warning1")}
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <Bitcoin class="h-3 w-3 text-[#36A18B] flex-shrink-0" />
              <div
                class="text-[10px] text-green whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {locale.t("bitcoin.send.icpAddress.warning2")}
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <Hourglass class="h-3 w-3 text-[#36A18B] flex-shrink-0" />
              <div
                class="text-[10px] text-green whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {locale.t("bitcoin.send.icpAddress.warning3")}
              </div>
            </div>
          </div>
        {:else if receiveType === ReceiveAddressType.PRINCIPAL && shouldShowAddressTypeSelector}
          <div class="flex items-start gap-1.5 mt-2">
            <Info class="h-4 w-4 text-[#36A18B] flex-shrink-0 mt-0.5" />
            <div class="text-sm text-green">
              {locale.t("wallet.send.principleIdInfoText")}
            </div>
          </div>
        {/if}
      </div>

      {#if isCkBtc}
        <div class="px-8 btc-gradient rounded-2xl py-4 mt-4 px-8">
          <h3 class="text-normal font-semibold mb-6 text-center">
            {locale.t("bitcoin.send.title")}
          </h3>
          <label
            for="native-btc-address-input"
            class="block text-sm font-medium mb-1.5"
          >
            {locale.t("wallet.send.btcNativeAddressLabel")}
          </label>

          <div class="relative">
            <input
              id="native-btc-address-input"
              type="text"
              bind:value={nativeBtcAddress}
              class="w-full p-2 pr-24 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green"
              placeholder={locale.t("wallet.send.btcAddressPlaceholder")}
            />
            <button
              onclick={() => handlePasteIntoField("btc")}
              class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#36A18B] text-sm font-medium hover:text-[#2d8a75] transition-colors"
            >
              <Clipboard size={16} />
            </button>
          </div>
          <div
            class="text-xs text-grey mt-1.5 mb-4 max-w-full whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {locale.t("wallet.send.addressBitcoinExample")}
          </div>
          <div class="flex flex-col gap-1.5 mt-2 mb-6">
            <div class="flex items-center gap-1.5">
              <LayoutList class="h-3 w-3 text-[#36A18B] flex-shrink-0" />
              <div
                class="text-[10px] text-green whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {locale.t("bitcoin.send.btcAddress.warning1")}
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <Coins class="h-3 w-3 text-[#36A18B] flex-shrink-0" />
              <div
                class="text-[10px] text-green whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {locale.t("bitcoin.send.btcAddress.warning2")}
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <ArrowLeftRight class="h-3 w-3 text-[#36A18B] flex-shrink-0" />
              <div
                class="text-[10px] text-green whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {locale.t("bitcoin.send.btcAddress.warning3")}
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <Coins class="h-3 w-3 text-[#36A18B] flex-shrink-0" />
              <div
                class="text-[10px] text-green whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {locale.t("bitcoin.send.btcAddress.warning4")}
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <Hourglass class="h-3 w-3 text-[#36A18B] flex-shrink-0" />
              <div
                class="text-[10px] text-green whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {locale.t("bitcoin.send.btcAddress.warning5")}
              </div>
            </div>
          </div>

          <SendBTC />
        </div>
      {/if}

      <div
        class="flex-none w-[95%] mx-auto px-2 sticky bottom-2 left-0 right-0 z-10 mt-auto"
      >
        <Button
          onclick={handleContinue}
          disabled={isCreatingExportBridge || isSending}
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
          type="button"
        >
          {#if isCreatingExportBridge}
            <div
              class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
            ></div>
          {/if}
          {locale.t("wallet.send.continueButton")}
        </Button>
      </div>
    </div>
  {:else if walletStore.query.isSuccess}
    <div class="text-center py-8 px-8">
      <p class="text-red-600">{locale.t("wallet.noTokensMsg")}</p>
    </div>
  {:else if walletStore.query.error}
    <div class="text-center py-8 px-8">
      <p class="text-red-600">
        {locale.t("wallet.errorMsg")}
        {walletStore.query.error}
      </p>
    </div>
  {/if}
</div>

{#if walletSource && !bridgeSource && !isStandaloneWallet}
  <WalletTxCart
    source={{
      ...walletSource,
      onSuccess: handleTxSuccess,
    }}
    bind:isOpen={showConfirmDrawer}
    onCloseDrawer={handleCloseDrawer}
  />
{/if}

{#if bridgeSource}
  <BridgeTxCart
    source={bridgeSource}
    bind:isOpen={showConfirmDrawer}
    minConfirmations={bridgeStore.minConfirmations}
    onCloseDrawer={handleCloseDrawer}
  />
{/if}
