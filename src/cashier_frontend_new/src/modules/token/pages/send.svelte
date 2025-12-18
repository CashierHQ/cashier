<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import Label from "$lib/shadcn/components/ui/label/label.svelte";
  import {
    formatBalanceUnits,
    parseBalanceUnits,
  } from "$modules/shared/utils/converter";
  import {
    ACCOUNT_ID_TYPE,
    ICP_LEDGER_CANISTER_ID,
    PRINCIPAL_TYPE,
  } from "$modules/token/constants";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { Principal } from "@dfinity/principal";
  import NavBar from "$modules/token/components/navBar.svelte";
  import { locale } from "$lib/i18n";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import SelectedAssetButtonInfo from "$modules/creationLink/components/tiplink/SelectedAssetButtonInfo.svelte";
  import TokenSelectorDrawer from "$modules/creationLink/components/shared/TokenSelectorDrawer.svelte";
  import { Clipboard } from "lucide-svelte";
  import { toast } from "svelte-sonner";
  import { page } from "$app/state";
  import ConfirmSendDrawer from "../components/confirmSendDrawer.svelte";
  import { validate } from "../utils/send";
    import InputAmount from "$modules/creationLink/components/inputAmount/inputAmount.svelte";

  let selectedToken: string = $state("");
  let receiveAddress: string = $state("");
  let receiveType: number = $state(PRINCIPAL_TYPE);

  let showAssetDrawer = $state(false);
  let tokenAmount: bigint = $state(0n);

  let showConfirmDrawer = $state(false);
  let txState: "confirm" | "pending" | "success" | "error" = $state("confirm");

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

  let selectedTokenObj: TokenWithPriceAndBalance | null = $derived.by(() => {
    if (!selectedToken || !walletStore.query.data) return null;
    const token = walletStore.findTokenByAddress(selectedToken);
    if (token.isErr()) return null;
    return token.unwrap();
  });

  let amount: number = $derived.by(() => {
    if (!selectedTokenObj || tokenAmount === 0n) return 0;
    return parseBalanceUnits(tokenAmount, selectedTokenObj.decimals);
  });

  let maxAmount: number = $derived.by(() => {
    if (!selectedTokenObj) return 0;
    return parseBalanceUnits(
      selectedTokenObj.balance,
      selectedTokenObj.decimals,
    );
  });

  let shouldShowAddressTypeSelector: boolean = $derived.by(
    () => selectedToken === ICP_LEDGER_CANISTER_ID,
  );

  $effect(() => {
    if (
      selectedToken !== ICP_LEDGER_CANISTER_ID &&
      receiveType === ACCOUNT_ID_TYPE
    ) {
      receiveType = PRINCIPAL_TYPE;
    }
  });

  $effect(() => {
    if (selectedTokenObj) {
      tokenAmount = 0n;
    }
  });

  let errorMessage: string = $state("");
  let isSending: boolean = $state(false);

  function handleSelectToken(address: string) {
    selectedToken = address;
    showAssetDrawer = false;
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
    errorMessage = "";

    const validationResult = validate({
      selectedToken,
      receiveAddress,
      amount,
      maxAmount,
    });

    if (!validationResult.success) {
      errorMessage = validationResult.errorMessage;
      return;
    }

    txState = "confirm";
    showConfirmDrawer = true;
  }

  async function handleConfirmSend() {
    errorMessage = "";
    txState = "pending";

    try {
      const token = walletStore.findTokenByAddress(selectedToken).unwrap();

      if (receiveType === PRINCIPAL_TYPE) {
        const receivePrincipal = Principal.fromText(receiveAddress);
        await walletStore.transferTokenToPrincipal(
          selectedToken,
          receivePrincipal,
          tokenAmount,
        );
      } else if (
        receiveType === ACCOUNT_ID_TYPE &&
        selectedToken === ICP_LEDGER_CANISTER_ID
      ) {
        await walletStore.transferICPToAccount(receiveAddress, tokenAmount);
      } else {
        throw new Error(locale.t("wallet.send.errors.invalidReceiveType"));
      }

      txState = "success";
    } catch (error) {
      txState = "error";
      toast.error(`${locale.t("wallet.send.errorMessagePrefix")} ${error}`);
      showConfirmDrawer = false;
    }
  }

  function handleCloseDrawer() {
    showConfirmDrawer = false;
    if (txState === "success") {
      receiveAddress = "";
      tokenAmount = 0n;
    }
    txState = "confirm";
  }

  const networkFee = $derived.by(() => {
    // TODO: Parse actual network fee from backend
    return "0.0001 ICP";
  });

  const transactionLink = $derived.by(() => {
    // TODO: Get actual transaction link
    return `https:example.com/transaction`;
  });
</script>

<NavBar />

<div class="px-4 grow-1 flex flex-col">
  {#if walletStore.query.data}
    <div class="space-y-4 grow-1 flex flex-col">
      {#if errorMessage}
        <div
          class="p-3 text-sm text-red-700 bg-red-100 rounded border border-red-200"
        >
          {errorMessage}
        </div>
      {/if}

      <div class="input-label-field-container space-y-1">
        <div class="flex w-full items-center">
          <Label>{locale.t("wallet.send.selectTokenLabel")}</Label>
        </div>

        <div>
          <button
            onclick={() => (showAssetDrawer = true)}
            class="w-full p-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-left"
          >
            {#if selectedTokenObj}
              <SelectedAssetButtonInfo
                selectedToken={selectedTokenObj}
                onOpenDrawer={() => (showAssetDrawer = true)}
              />
            {:else}
              <span class="text-gray-500">
                {locale.t("links.linkForm.addAsset.chooseAsset")}
              </span>
            {/if}
          </button>

          <TokenSelectorDrawer
            bind:open={showAssetDrawer}
            selectedAddress={selectedToken}
            onSelectToken={handleSelectToken}
          />
        </div>
      </div>

      {#if selectedTokenObj}
        <div class="input-label-field-container space-y-1">
          <InputAmount
            token={selectedTokenObj}
            bind:tokenAmount={tokenAmount}
          />
        </div>
      {/if}

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
              onclick={() => (receiveType = PRINCIPAL_TYPE)}
              class="flex-1 p-2 border rounded-lg text-sm font-medium transition-colors {receiveType ===
              PRINCIPAL_TYPE
                ? 'border-[#36A18B] bg-green-50'
                : 'border-gray-300 hover:border-gray-400'}"
            >
              {locale.t("wallet.send.principalId")}
            </button>
            <button
              onclick={() => (receiveType = ACCOUNT_ID_TYPE)}
              class="flex-1 p-2 border rounded-lg text-sm font-medium transition-colors {receiveType ===
              ACCOUNT_ID_TYPE
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
            receiveType === PRINCIPAL_TYPE
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
  {:else}
    <div class="text-center py-8">
      <p class="text-gray-500">{locale.t("wallet.loadingMsg")}</p>
    </div>
  {/if}
</div>

<ConfirmSendDrawer
  bind:open={showConfirmDrawer}
  {txState}
  {amount}
  selectedToken={selectedTokenObj}
  {receiveAddress}
  {networkFee}
  {transactionLink}
  onClose={handleCloseDrawer}
  onConfirm={handleConfirmSend}
/>