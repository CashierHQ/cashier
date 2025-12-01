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
  import { X } from "lucide-svelte";
  import { ICP_LEDGER_CANISTER_ID } from "$modules/token/constants";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import { ActionType } from "$modules/links/types/action/actionType";
  import IntentTask from "$modules/links/types/action/intentTask";
  import { locale } from "$lib/i18n";

  let {
    action,
    isOpen,
    onCloseDrawer,
    handleProcessAction,
  }: {
    action: Action;
    isOpen: boolean;
    onCloseDrawer: () => void;
    handleProcessAction: () => Promise<ProcessActionResult>;
  } = $props();

  const txCartStore = new TransactionCartStore(action, handleProcessAction);
  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let isProcessing: boolean = $state(false);

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
  let failedImageLoads = $state<Set<string>>(new Set());

  // Get token logo URL
  function getTokenLogo(address: string): string {
    if (address === ICP_LEDGER_CANISTER_ID) {
      return "/icpLogo.png";
    }
    return `https://api.icexplorer.io/images/${address}`;
  }

  function handleImageError(address: string) {
    failedImageLoads.add(address);
  }

  // Convert action.intents to assetsWithTokenInfo format for YouSendSection
  const assetsWithTokenInfo = $derived.by(() => {
    if (action.type !== ActionType.CREATE_LINK) return [];
    
    // Get assets directly from intents, excluding link creation fee
    return action.intents
      .filter((intent) => {
        // Exclude TRANSFER_WALLET_TO_TREASURY (link creation fee)
        return intent.task !== IntentTask.TRANSFER_WALLET_TO_TREASURY;
      })
      .map((intent) => {
        const assetAddress = intent.type.payload.asset.address.toString();
        const token = walletStore.query.data?.find(
          (t) => t.address === assetAddress,
        );
        
        if (!token) return null;

        // Get amount from intent payload
        const amountBigInt = intent.type.payload.amount;
        const amount = parseBalanceUnits(amountBigInt, token.decimals);
        const usdValue = token.priceUSD ? amount * token.priceUSD : 0;

        return {
          address: assetAddress,
          amount,
          token: {
            symbol: token.symbol,
            decimals: token.decimals,
            priceUSD: token.priceUSD,
          },
          usdValue,
          logo: getTokenLogo(assetAddress),
        };
      })
      .filter((item) => item !== null) as Array<{
        address: string;
        amount: number;
        token: {
          symbol: string;
          decimals: number;
          priceUSD?: number;
        };
        usdValue: number;
        logo: string;
      }>;
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
    const feeAmountBigInt = BigInt(Math.round(feeAmount * Math.pow(10, token.decimals)));

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

  /**
   * Handle confirm button click.
   */
  async function handleConfirm() {
    isProcessing = true;
    errorMessage = null;
    successMessage = null;

    try {
      const processActionResult = await txCartStore.processAction();
      if (processActionResult.isSuccess) {
        successMessage = locale.t("links.linkForm.drawers.txCart.successMessage");
        onCloseDrawer?.();
      } else {
        errorMessage = `${locale.t("links.linkForm.drawers.txCart.errorMessagePrefix")} ${processActionResult.errors.join(", ")}`;
      }
    } catch (e) {
      errorMessage = `${locale.t("links.linkForm.drawers.txCart.errorMessagePrefix")} ${(e as Error).message}`;
    } finally {
      isProcessing = false;
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
                assetsWithTokenInfo={assetsWithTokenInfo}
                {failedImageLoads}
                onImageError={handleImageError}
                linkCreationFee={linkCreationFee || undefined}
              />
            {/if}

            <FeesBreakdownSection
              {totalFeesUsd}
              isClickable={false}
              onInfoClick={() => (showFeeBreakdown = true)}
            />

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
          {isProcessing ? locale.t("links.linkForm.drawers.txCart.processingButton") : locale.t("links.linkForm.drawers.txCart.confirmButton")}
        </Button>
      </div>
      {/if}
    </Drawer.Content>
  </Drawer.Root>
{/if}
