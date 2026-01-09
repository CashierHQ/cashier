<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import * as Drawer from "$lib/shadcn/components/ui/drawer";
  import type { ProcessActionResult } from "$modules/links/types/action/action";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { onMount } from "svelte";
  import { TransactionCartStore } from "$modules/transactionCart/state/txCartStore.svelte";
  import {
    FlowDirection,
    isActionSource,
    isWalletSource,
    type TransactionSource,
  } from "$modules/transactionCart/types/transaction-source";
  import YouSendSection from "$modules/transactionCart/components/YouSendSection.svelte";
  import YouReceiveSection from "$modules/transactionCart/components/YouReceiveSection.svelte";
  import FeesBreakdownSection from "$modules/creationLink/components/previewSections/FeesBreakdownSection.svelte";
  import FeeInfoDrawer from "$modules/creationLink/components/drawers/FeeInfoDrawer.svelte";
  import { X } from "lucide-svelte";
  import { locale } from "$lib/i18n";
  import { feeService } from "$modules/shared/services/feeService";
  import type { AssetAndFee } from "$modules/shared/types/feeService";
  import { assertUnreachable } from "$lib/rsMatch";
  import { AssetProcessState } from "$modules/transactionCart/types/txCart";

  let {
    source,
    isOpen = $bindable(false),
    onCloseDrawer,
  }: {
    source: TransactionSource;
    isOpen: boolean;
    onCloseDrawer: () => void;
  } = $props();

  const txCartStore = new TransactionCartStore(source);

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let isProcessingLocally: boolean = $state(false);

  // Processing state (internal only now)
  const isProcessing = $derived.by(() => isProcessingLocally);

  // Build tokens map from walletStore
  const tokensMap = $derived.by(() =>
    Object.fromEntries(
      (walletStore.query.data ?? []).map((t) => [t.address, t]),
    ),
  );

  let showFeeInfoDrawer = $state(false);
  let failedImageLoads = $state<Set<string>>(new Set());

  function handleImageError(address: string) {
    failedImageLoads.add(address);
  }

  // Initialize wallet assets in $effect (mutations allowed here)
  $effect(() => {
    if (isWalletSource(source) && Object.keys(tokensMap).length > 0) {
      txCartStore.initializeWalletAssets(tokensMap);
    }
  });

  // Get fees breakdown from store - pure derivation (no mutations)
  const assetAndFee = $derived.by(() => {
    if (isWalletSource(source)) {
      // For WalletSource, return reactive state (updated by initializeWalletAssets and execute)
      return txCartStore.assetAndFeeList;
    }
    // ActionSource: compute fresh each time (stateless)
    return txCartStore.computeAssetAndFee(tokensMap);
  });
  const outgoingAssets = $derived.by(() =>
    assetAndFee.filter(
      (item) => item.asset.direction === FlowDirection.OUTGOING,
    ),
  );
  const incomingAssets = $derived.by(() =>
    assetAndFee.filter(
      (item) => item.asset.direction === FlowDirection.INCOMING,
    ),
  );
  const totalFeesUsd = $derived.by(() =>
    assetAndFee.reduce((sum, item) => sum + (item.fee?.usdValue ?? 0), 0),
  );
  const feesBreakdown = $derived.by(() =>
    feeService.buildFeesBreakdownFromAssetAndFeeList(
      assetAndFee,
      walletStore.query.data ?? [],
    ),
  );

  // Handle fee breakdown click - close txCart and show FeeInfoDrawer
  function handleFeeBreakdownClick() {
    if (isProcessing) return;
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
   * Supports both ActionSource (ProcessActionResult) and WalletSource (bigint) results.
   */
  async function handleConfirm() {
    isProcessingLocally = true;
    errorMessage = null;
    successMessage = null;

    try {
      const result = await txCartStore.execute();

      if (isActionSource(source)) {
        // ActionSource: result is ProcessActionResult
        const actionResult = result as ProcessActionResult;
        if (actionResult.isSuccess) {
          successMessage = locale.t(
            "links.linkForm.drawers.txCart.successMessage",
          );
          source.onSuccess?.(actionResult);
          onCloseDrawer?.();
        } else {
          errorMessage = `${locale.t("links.linkForm.drawers.txCart.errorMessagePrefix")} ${actionResult.errors.join(", ")}`;
        }
      } else if (isWalletSource(source)) {
        // WalletSource: result is blockId (bigint)
        // State transitions handled by store's #executeWallet
        successMessage = locale.t(
          "links.linkForm.drawers.txCart.successMessage",
        );
        source.onSuccess?.(result as bigint);
        onCloseDrawer?.();
      }

      assertUnreachable(source as never);
    } catch (e) {
      errorMessage = `${locale.t("links.linkForm.drawers.txCart.errorMessagePrefix")} ${(e as Error).message}`;
    } finally {
      isProcessingLocally = false;
    }
  }

  /**
   * Handle drawer open state changes.
   * Skip onCloseDrawer when transitioning to FeeInfoDrawer to keep component mounted.
   */
  function handleOpenChange(open: boolean) {
    if (!open && !showFeeInfoDrawer) {
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

{#if source}
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
          {#if outgoingAssets.length > 0}
            <YouSendSection
              assets={outgoingAssets}
              {failedImageLoads}
              onImageError={handleImageError}
              {isProcessing}
              hasError={!!errorMessage}
            />
          {/if}

          {#if incomingAssets.length > 0}
            <YouReceiveSection
              assets={incomingAssets}
              {failedImageLoads}
              onImageError={handleImageError}
              {isProcessing}
              hasError={!!errorMessage}
            />
          {/if}

          {#if totalFeesUsd > 0}
            <FeesBreakdownSection
              {totalFeesUsd}
              onBreakdownClick={handleFeeBreakdownClick}
              disabled={isProcessing}
            />
          {/if}

          <p class="mt-2 text-sm">
            {locale.t("links.linkForm.drawers.txCart.termsAgreement")}
          </p>
        </div>
      </div>

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
    </Drawer.Content>
  </Drawer.Root>

  <!-- FeeInfoDrawer for showing fees breakdown -->
  <FeeInfoDrawer
    bind:open={showFeeInfoDrawer}
    onOpenChange={(open) => {
      if (!open) {
        isOpen = true;
      }
    }}
    onBack={handleFeeInfoDrawerBack}
    {feesBreakdown}
  />
{/if}
