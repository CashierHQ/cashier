<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import * as Drawer from "$lib/shadcn/components/ui/drawer";
  import type Action from "$modules/links/types/action/action";
  import type { ProcessActionResult } from "$modules/links/types/action/action";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import {
    feeService,
    type AssetAndFee,
  } from "$modules/transactionCart/services/feeService";
  import { onMount } from "svelte";
  import { TransactionCartStore } from "../state/txCartStore.svelte";
  import { AssetProcessState } from "../types/txCart";
  import YouSendSection from "$modules/creationLink/components/previewSections/YouSendSection.svelte";
  import FeesBreakdownSection from "$modules/creationLink/components/previewSections/FeesBreakdownSection.svelte";
  import FeeBreakdown from "./feeBreakdown.svelte";
  import FeeInfoDrawer from "$modules/creationLink/components/drawers/FeeInfoDrawer.svelte";
  import { X } from "lucide-svelte";
  import { ActionType } from "$modules/links/types/action/actionType";
  import IntentTask from "$modules/links/types/action/intentTask";
  import { locale } from "$lib/i18n";
  import {
    calculateAssetsWithTokenInfo,
    type FeeBreakdownItem,
  } from "$modules/links/utils/feesBreakdown";

  let {
    action,
    isOpen: isOpenProp,
    onCloseDrawer,
    handleProcessAction,
    isProcessing: externalIsProcessing,
  }: {
    action: Action;
    isOpen: boolean;
    onCloseDrawer: () => void;
    handleProcessAction: () => Promise<ProcessActionResult>;
    isProcessing?: boolean;
  } = $props();

  const txCartStore = new TransactionCartStore(action, handleProcessAction);

  // Local state for managing drawer open/close
  // eslint-disable-next-line svelte/prefer-writable-derived
  let isOpen = $state(isOpenProp);

  // Sync isOpen prop with local state
  $effect(() => {
    isOpen = isOpenProp;
  });

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let isProcessingLocally: boolean = $state(false);

  // Combine local processing state with external processing state
  const isProcessing = $derived.by(() => {
    return isProcessingLocally || (externalIsProcessing ?? false);
  });

  const assetAndFeeList: AssetAndFee[] = $derived.by(() => {
    const list = feeService.mapActionToAssetAndFeeList(
      action,
      // build a record keyed by token address for the service
      Object.fromEntries(
        (walletStore.query.data ?? []).map((t) => [t.address, t]),
      ),
    );

    if (isProcessing) {
      // when processing, we want to show all assets as processing
      return list.map((item) => ({
        ...item,
        asset: {
          ...item.asset,
          state: AssetProcessState.PROCESSING,
        },
      }));
    }

    return list;
  });

  let showFeeBreakdown = $state(false);
  let showFeeInfoDrawer = $state(false);
  let failedImageLoads = $state<Set<string>>(new Set());

  function handleImageError(address: string) {
    failedImageLoads.add(address);
  }

  // Convert action.intents to assetsWithTokenInfo format for YouSendSection
  const assetsWithTokenInfo = $derived.by(() => {
    if (action.type === ActionType.CREATE_LINK) {
      // Get assets directly from intents, excluding link creation fee
      const assets = action.intents
        .filter((intent) => {
          // Exclude TRANSFER_WALLET_TO_TREASURY (link creation fee)
          return intent.task !== IntentTask.TRANSFER_WALLET_TO_TREASURY;
        })
        .map((intent) => ({
          address: intent.type.payload.asset.address.toString(),
          amount: intent.type.payload.amount,
        }));

      return calculateAssetsWithTokenInfo(
        assets,
        walletStore.findTokenByAddress.bind(walletStore),
      );
    }

    if (action.type === ActionType.WITHDRAW) {
      // For WITHDRAW, intent.amount is already the amount to be returned (after backend fee deduction)
      // We show this amount and the network fee separately
      const assets = action.intents.map((intent) => ({
        address: intent.type.payload.asset.address.toString(),
        amount: intent.type.payload.amount, // Amount to be returned
      }));

      return calculateAssetsWithTokenInfo(
        assets,
        walletStore.findTokenByAddress.bind(walletStore),
      );
    }

    if (action.type === ActionType.RECEIVE) {
      const assets = action.intents.map((intent) => ({
        address: intent.type.payload.asset.address.toString(),
        amount: intent.type.payload.amount, // Amount to be received
      }));

      return calculateAssetsWithTokenInfo(
        assets,
        walletStore.findTokenByAddress.bind(walletStore),
      );
    }

    return [];
  });

  // Calculate total fees in USD
  const totalFeesUsd = $derived.by(() => {
    return assetAndFeeList.reduce(
      (total, item) => total + (item.fee?.usdValue || 0),
      0,
    );
  });

  // Find link creation fee from fees
  const linkCreationFee = $derived.by(() => {
    // Find fee with CREATE_LINK_FEE type or TRANSFER_WALLET_TO_TREASURY task
    const linkCreationFeeItem = assetAndFeeList.find(
      (item) =>
        item.fee?.feeType === "CREATE_LINK_FEE" ||
        action.intents.some(
          (intent) =>
            intent.task === IntentTask.TRANSFER_WALLET_TO_TREASURY &&
            intent.type.payload.asset.address.toString() === item.asset.address,
        ),
    );

    if (!linkCreationFeeItem?.fee) return null;

    const token = walletStore.query.data?.find(
      (t) => t.address === linkCreationFeeItem.asset.address,
    );
    if (!token) return null;

    // Parse fee amount from string
    const feeAmountStr = linkCreationFeeItem.fee.amount.replace(/,/g, "");
    const feeAmount = parseFloat(feeAmountStr);
    const feeAmountBigInt = BigInt(
      Math.round(feeAmount * Math.pow(10, token.decimals)),
    );

    return {
      amount: feeAmountBigInt,
      tokenAddress: linkCreationFeeItem.asset.address,
      tokenSymbol: token.symbol,
      tokenDecimals: token.decimals,
      usdAmount: linkCreationFeeItem.fee.usdValue || 0,
    };
  });

  // Check if this is a send link (CREATE_LINK action)
  const isSendLink = $derived.by(() => {
    return action.type === ActionType.CREATE_LINK;
  });

  // Check if this is a withdraw action
  const isWithdraw = $derived.by(() => {
    return action.type === ActionType.WITHDRAW;
  });

  // Check if this is a receive action (user claiming from link)
  const isReceive = $derived.by(() => {
    return action.type === ActionType.RECEIVE;
  });

  // Convert assetAndFeeList to feesBreakdown format for FeeInfoDrawer
  const feesBreakdown = $derived.by((): FeeBreakdownItem[] => {
    return feeService.buildFeesBreakdownFromAssetAndFeeList(
      assetAndFeeList,
      walletStore.query.data ?? [],
    );
  });

  // Handle fee breakdown click - close txCart and show FeeInfoDrawer
  function handleFeeBreakdownClick() {
    // Don't open drawer if processing
    if (isProcessing) {
      return;
    }
    isOpen = false;
    showFeeInfoDrawer = true;
  }

  // Handle back button in FeeInfoDrawer - close FeeInfoDrawer and reopen txCart
  function handleFeeInfoDrawerBack() {
    showFeeInfoDrawer = false;
    isOpen = true;
  }

  /**
   * Handle confirm button click.
   */
  async function handleConfirm() {
    isProcessingLocally = true;
    errorMessage = null;
    successMessage = null;

    try {
      const processActionResult = await txCartStore.processAction();
      if (processActionResult.isSuccess) {
        successMessage = locale.t(
          "links.linkForm.drawers.txCart.successMessage",
        );
        onCloseDrawer?.();
      } else {
        errorMessage = `${locale.t("links.linkForm.drawers.txCart.errorMessagePrefix")} ${processActionResult.errors.join(", ")}`;
      }
    } catch (e) {
      errorMessage = `${locale.t("links.linkForm.drawers.txCart.errorMessagePrefix")} ${(e as Error).message}`;
    } finally {
      isProcessingLocally = false;
    }
  }

  /**
   * Handle drawer open state changes.
   * @param open
   */
  function handleOpenChange(open: boolean) {
    if (!open) {
      onCloseDrawer();
    }
  }

  /**
   * Initialize the txCartStore on mount.
   */
  onMount(() => {
    txCartStore.initialize();
  });
</script>

{#if action}
  <Drawer.Root bind:open={isOpen} onOpenChange={handleOpenChange}>
    <Drawer.Content class="max-w-full w-[400px] mx-auto p-3">
      <Drawer.Header>
        <div class="flex justify-center items-center relative mb-2 px-3">
          <Drawer.Title
            class="text-[18px] font-semibold leading-[20px] px-8 text-center w-[100%]"
          >
            {locale.t("links.linkForm.drawers.txCart.title")}
          </Drawer.Title>
          <Drawer.Close>
            <X
              size={28}
              stroke-width={1.5}
              class="absolute right-0 cursor-pointer top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
              aria-hidden="true"
              onclick={onCloseDrawer}
            />
          </Drawer.Close>
        </div>
      </Drawer.Header>

      <div class="px-4 pb-4 h-auto">
        {#if showFeeBreakdown}
          <!-- When showing breakdown, hide all other tx cart content -->
          <FeeBreakdown
            {assetAndFeeList}
            onBack={() => (showFeeBreakdown = false)}
          />
        {:else}
          {#if errorMessage}
            <div
              class="mb-3 p-2 bg-red-100 border border-red-300 text-red-700 rounded text-sm"
            >
              {errorMessage}
            </div>
          {/if}
          {#if successMessage}
            <div
              class="mb-3 p-2 bg-green-100 border border-green-300 text-green-700 rounded text-sm"
            >
              {successMessage}
            </div>
          {/if}

          <div class="mt-2 space-y-4">
            {#if isSendLink && assetsWithTokenInfo.length > 0}
              <YouSendSection
                {assetsWithTokenInfo}
                {failedImageLoads}
                onImageError={handleImageError}
                linkCreationFee={linkCreationFee || undefined}
                {isProcessing}
                hasError={!!errorMessage}
              />

              <FeesBreakdownSection
                {totalFeesUsd}
                onBreakdownClick={handleFeeBreakdownClick}
                disabled={isProcessing}
              />
            {/if}

            {#if isWithdraw && assetsWithTokenInfo.length > 0}
              <YouSendSection
                {assetsWithTokenInfo}
                {failedImageLoads}
                onImageError={handleImageError}
                {isProcessing}
                isReceive={true}
                hasError={!!errorMessage}
              />
            {/if}

            {#if isReceive && assetsWithTokenInfo.length > 0}
              <YouSendSection
                {assetsWithTokenInfo}
                {failedImageLoads}
                onImageError={handleImageError}
                {isProcessing}
                isReceive={true}
                hasError={!!errorMessage}
              />
            {/if}

            <p class="mt-2 text-sm">
              {locale.t("links.linkForm.drawers.txCart.termsAgreement")}
            </p>
          </div>
        {/if}
      </div>

      {#if !showFeeBreakdown}
        <div class="px-3 mb-2">
          <Button
            class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
            onclick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing
              ? locale.t("links.linkForm.drawers.txCart.processingButton")
              : locale.t("links.linkForm.drawers.txCart.confirmButton")}
          </Button>
        </div>
      {/if}
    </Drawer.Content>
  </Drawer.Root>

  <!-- FeeInfoDrawer for showing fees breakdown -->
  <FeeInfoDrawer
    bind:open={showFeeInfoDrawer}
    onClose={() => {
      showFeeInfoDrawer = false;
    }}
    onBack={handleFeeInfoDrawerBack}
    {feesBreakdown}
  />
{/if}
