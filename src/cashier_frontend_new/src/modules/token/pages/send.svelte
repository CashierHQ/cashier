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
  import { formatUsdAmount } from "$modules/shared/utils/formatNumber";
  import AssetButton from "$modules/creationLink/components/tiplink/AssetButton.svelte";
  import SelectedAssetButtonInfo from "$modules/creationLink/components/tiplink/SelectedAssetButtonInfo.svelte";
  import TokenSelectorDrawer from "$modules/creationLink/components/shared/TokenSelectorDrawer.svelte";
  import { Clipboard, X, LoaderCircle, CircleCheck } from "lucide-svelte";
  import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerClose,
  } from "$lib/shadcn/components/ui/drawer";
  import { toast } from "svelte-sonner";
  import { page } from "$app/state";
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import { shortenAddress } from "../utils/address";

  let selectedToken: string = $state("");
  let receiveAddress: string = $state("");
  let receiveType: number = $state(PRINCIPAL_TYPE);

  let showAssetDrawer = $state(false);
  let localTokenAmount = $state("");
  let localUsdAmount = $state("");
  let isUsd = $state(false);

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

  const tokenUsdPrice = $derived.by(() => {
    return selectedTokenObj?.priceUSD;
  });

  const canConvert = $derived.by(() => {
    return tokenUsdPrice !== undefined && tokenUsdPrice > 0;
  });

  let amount: number = $state(0);
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
    if (localTokenAmount) {
      const num = parseFloat(localTokenAmount);
      if (!isNaN(num) && num > 0) {
        amount = num;
      } else {
        amount = 0;
      }
    } else {
      amount = 0;
    }
  });

  $effect(() => {
    if (selectedTokenObj && localTokenAmount === "") {
      localTokenAmount = "";
      localUsdAmount = "";
      amount = 0;
    }
  });

  let errorMessage: string = $state("");
  let isSending: boolean = $state(false);
  const isMaxAvailable = $derived.by(() => maxAmount > 0 && !isSending);

  const tokenLogo = $derived(
    selectedTokenObj ? getTokenLogo(selectedTokenObj.address) : null,
  );
  let imageLoadFailed = $state(false);

  const networkLogo =
    "https://cryptologos.cc/logos/internet-computer-icp-logo.png";
  let networkImageLoadFailed = $state(false);

  function handleSelectToken(address: string) {
    selectedToken = address;
    showAssetDrawer = false;
  }

  function handleAmountChange(value: string) {
    if (isUsd) {
      localUsdAmount = value;

      if (canConvert && tokenUsdPrice && !isNaN(parseFloat(value))) {
        const tokenValue = parseFloat(value) / tokenUsdPrice;
        localTokenAmount = tokenValue.toString();
      } else {
        localTokenAmount = "";
      }
    } else {
      localTokenAmount = value;

      if (canConvert && tokenUsdPrice && !isNaN(parseFloat(value))) {
        const usdValue = parseFloat(value) * tokenUsdPrice;
        const roundedUsdValue = Math.round(usdValue * 10000) / 10000;
        localUsdAmount = formatUsdAmount(roundedUsdValue);
      } else {
        localUsdAmount = "";
      }
    }
  }

  function handleToggleUsd(value: boolean) {
    isUsd = value;
  }

  function handleMaxClick() {
    if (!isMaxAvailable || !selectedTokenObj) return;
    amount = maxAmount;
    localTokenAmount = maxAmount.toString();

    if (canConvert && tokenUsdPrice) {
      const usdValue = maxAmount * tokenUsdPrice;
      const roundedUsdValue = Math.round(usdValue * 10000) / 10000;
      localUsdAmount = formatUsdAmount(roundedUsdValue);
    }
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

    if (!validate()) {
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
      const balanceAmount = formatBalanceUnits(amount, token.decimals);

      if (receiveType === PRINCIPAL_TYPE) {
        const receivePrincipal = Principal.fromText(receiveAddress);
        await walletStore.transferTokenToPrincipal(
          selectedToken,
          receivePrincipal,
          balanceAmount,
        );
      } else if (
        receiveType === ACCOUNT_ID_TYPE &&
        selectedToken === ICP_LEDGER_CANISTER_ID
      ) {
        await walletStore.transferICPToAccount(receiveAddress, balanceAmount);
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
      localTokenAmount = "";
      localUsdAmount = "";
      amount = 0;
    }
    txState = "confirm";
  }

  function validate(): boolean {
    errorMessage = "";

    if (!selectedToken || selectedToken.trim() === "") {
      errorMessage = locale.t("wallet.send.errors.selectToken");
      return false;
    }

    if (!receiveAddress || receiveAddress.trim() === "") {
      errorMessage = locale.t("wallet.send.errors.enterAddress");
      return false;
    }

    if (amount <= 0) {
      errorMessage = locale.t("wallet.send.errors.amountGreaterThanZero");
      return false;
    }

    if (amount > maxAmount) {
      errorMessage = locale
        .t("wallet.send.errors.amountExceedsMax")
        .replace("{{max}}", String(maxAmount));
      return false;
    }

    return true;
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
          {#if selectedTokenObj}
            <button
              onclick={handleMaxClick}
              disabled={!isMaxAvailable}
              class="ml-auto text-[12px] font-medium transition-colors {isMaxAvailable
                ? 'text-[#36A18B] cursor-pointer hover:text-[#2d8a75]'
                : 'text-gray-400 cursor-not-allowed'}"
            >
              {locale.t("links.linkForm.addAsset.max")}
            </button>
          {/if}
        </div>

        <div>
          <AssetButton
            text={locale.t("links.linkForm.addAsset.chooseAsset")}
            tokenValue={localTokenAmount}
            usdValue={localUsdAmount}
            onInputChange={handleAmountChange}
            {isUsd}
            onToggleUsd={handleToggleUsd}
            token={selectedTokenObj}
            {canConvert}
            maxBalanceWithFee={maxAmount}
          >
            {#if selectedTokenObj}
              <SelectedAssetButtonInfo
                selectedToken={selectedTokenObj}
                onOpenDrawer={() => (showAssetDrawer = true)}
              />
            {/if}
          </AssetButton>

          <TokenSelectorDrawer
            bind:open={showAssetDrawer}
            selectedAddress={selectedToken}
            onSelectToken={handleSelectToken}
          />
        </div>
      </div>

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

<Drawer bind:open={showConfirmDrawer}>
  <DrawerContent class="max-w-full w-[400px] mx-auto">
    <DrawerHeader>
      <div class="flex justify-center items-center relative mb-2">
        <DrawerTitle
          class="text-[18px] font-[600] leading-[20px] px-8 text-center w-[100%]"
        >
          {locale.t("wallet.send.confirmDrawer.title")}
        </DrawerTitle>
        {#if txState === "confirm"}
          <DrawerClose>
            <X
              size={24}
              stroke-width={2}
              class="absolute right-2 cursor-pointer top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
              aria-hidden="true"
            />
          </DrawerClose>
        {/if}
      </div>
    </DrawerHeader>

    <div class="px-4 pb-4">
      {#if txState === "confirm"}
        <div class="space-y-4">
          <div class="text-center">
            <div class="text-sm text-gray-600 mb-2">
              {locale.t("wallet.send.confirmDrawer.youWillSend")}
            </div>
            <div class="text-4xl font-bold">
              {amount}
              {selectedTokenObj?.symbol || ""}
            </div>
          </div>

          <div class="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-gray-600"
                >{locale.t("wallet.send.confirmDrawer.to")}</span
              >
              <span class="text-sm font-mono truncate ml-2 max-w-[200px]"
                >{shortenAddress(receiveAddress)}</span
              >
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600"
                >{locale.t("wallet.send.confirmDrawer.network")}</span
              >
              <div class="flex items-center gap-1">
                <span>ICP</span>
                <div
                  class="relative flex shrink-0 overflow-hidden rounded-full w-4 h-4"
                >
                  {#if !networkImageLoadFailed}
                    <img
                      alt="ICP Network"
                      class="w-full h-full object-cover rounded-full"
                      src={networkLogo}
                      onerror={() => (networkImageLoadFailed = true)}
                    />
                  {:else}
                    <div
                      class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-[8px]"
                    >
                      ICP
                    </div>
                  {/if}
                </div>
              </div>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-600"
                >{locale.t("wallet.send.confirmDrawer.networkFee")}</span
              >
              <div class="flex items-center gap-1">
                <span>{networkFee}</span>
                <div
                  class="relative flex shrink-0 overflow-hidden rounded-full w-4 h-4"
                >
                  {#if !networkImageLoadFailed}
                    <img
                      alt="ICP Network"
                      class="w-full h-full object-cover rounded-full"
                      src={networkLogo}
                      onerror={() => (networkImageLoadFailed = true)}
                    />
                  {:else}
                    <div
                      class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-[8px]"
                    >
                      ICP
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>

          <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex justify-between items-center">
              <span class="font-medium"
                >{locale.t("wallet.send.confirmDrawer.totalFees")}</span
              >
              <div class="flex items-center gap-2">
                {#if selectedTokenObj}
                  <div class="flex items-center gap-1">
                    <span class="font-medium"
                      >{amount} {selectedTokenObj.symbol}</span
                    >
                    <div
                      class="relative flex shrink-0 overflow-hidden rounded-full w-4 h-4"
                    >
                      {#if tokenLogo && !imageLoadFailed}
                        <img
                          alt={selectedTokenObj.symbol}
                          class="w-full h-full object-cover rounded-full"
                          src={tokenLogo}
                          onerror={() => (imageLoadFailed = true)}
                        />
                      {:else}
                        <div
                          class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-[8px]"
                        >
                          {selectedTokenObj.symbol[0]?.toUpperCase() || "?"}
                        </div>
                      {/if}
                    </div>
                  </div>
                  <span class="font-medium">+</span>
                {/if}
                <div class="flex items-center gap-1">
                  <span class="font-medium">{networkFee}</span>
                  <div
                    class="relative flex shrink-0 overflow-hidden rounded-full w-4 h-4"
                  >
                    {#if !networkImageLoadFailed}
                      <img
                        alt="ICP Network"
                        class="w-full h-full object-cover rounded-full"
                        src={networkLogo}
                        onerror={() => (networkImageLoadFailed = true)}
                      />
                    {:else}
                      <div
                        class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-[8px]"
                      >
                        ICP
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="text-xs text-gray-600 text-center">
            {locale.t("wallet.send.confirmDrawer.agreementText")}
          </div>

          <Button
            onclick={handleConfirmSend}
            class="w-full rounded-full bg-[#36A18B] hover:bg-[#2d8a75] text-white h-[44px]"
          >
            {locale.t("wallet.send.confirmDrawer.confirmButton")}
          </Button>
        </div>
      {:else if txState === "pending"}
        <div class="text-center py-8 space-y-4">
          <div class="flex justify-center">
            <div
              class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <LoaderCircle size={32} class="text-[#36A18B] animate-spin" />
            </div>
          </div>
          <div>
            <div class="font-semibold mb-2">
              {locale.t("wallet.send.pendingDrawer.title")}
            </div>
            <div class="text-sm text-gray-600">
              {locale.t("wallet.send.pendingDrawer.description")}
            </div>
          </div>
          <a
            href={transactionLink}
            target="_blank"
            rel="noopener noreferrer"
            class="text-[#36A18B] text-sm font-medium inline-block cursor-pointer"
          >
            {locale.t("wallet.send.pendingDrawer.viewTransaction")}
          </a>
          <div class="text-gray-400 text-sm">
            {locale.t("wallet.send.pendingDrawer.statusText")}
          </div>
        </div>
      {:else if txState === "success"}
        <div class="text-center py-8 space-y-4">
          <div class="flex justify-center">
            <div
              class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center"
            >
              <CircleCheck size={32} class="text-[#36A18B]" />
            </div>
          </div>
          <div>
            <div class="font-semibold mb-2">
              {locale.t("wallet.send.successDrawer.title")}
            </div>
            <div class="text-sm text-gray-600">
              {locale.t("wallet.send.successDrawer.description")}
            </div>
          </div>
          <a
            href={transactionLink}
            target="_blank"
            rel="noopener noreferrer"
            class="text-[#36A18B] text-sm font-medium inline-block cursor-pointer"
          >
            {locale.t("wallet.send.pendingDrawer.viewTransaction")}
          </a>
          <Button
            onclick={handleCloseDrawer}
            class="w-full rounded-full bg-[#36A18B] hover:bg-[#2d8a75] text-white h-[44px]"
          >
            {locale.t("wallet.send.successDrawer.closeButton")}
          </Button>
        </div>
      {/if}
    </div>
  </DrawerContent>
</Drawer>
