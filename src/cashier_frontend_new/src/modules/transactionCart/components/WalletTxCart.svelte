<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import * as Drawer from "$lib/shadcn/components/ui/drawer";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import { onMount } from "svelte";
  import { WalletTxCartStore } from "$modules/transactionCart/state/wallet-tx-cart-store.svelte";
  import {
    FlowDirection,
    type WalletSource,
  } from "$modules/transactionCart/types/transaction-source";
  import { AssetProcessState } from "$modules/transactionCart/types/txCart";
  import YouSendSection from "$modules/transactionCart/components/shared/YouSendSection.svelte";
  import YouReceiveSection from "$modules/transactionCart/components/shared/YouReceiveSection.svelte";
  import FeesBreakdownSection from "$modules/creationLink/components/previewSections/FeesBreakdownSection.svelte";
  import FeeInfoDrawer from "$modules/creationLink/components/drawers/FeeInfoDrawer.svelte";
  import { X } from "lucide-svelte";
  import { locale } from "$lib/i18n";
  import { feeService } from "$modules/shared/services/feeService";

  let {
    source,
    isOpen = $bindable(false),
    onCloseDrawer,
  }: {
    source: WalletSource;
    isOpen: boolean;
    onCloseDrawer: () => void;
  } = $props();

  /** Store recreated when source changes */
  const walletTxCartStore = $derived(new WalletTxCartStore(source));

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

  // Build tokens map from walletStore
  const tokensMap = $derived.by(() =>
    Object.fromEntries(
      (walletStore.query.data ?? []).map((t) => [t.address, t]),
    ),
  );

  let showFeeInfoDrawer = $state(false);

  // Hardcoded i18n key for wallet source
  const txCartI18nKey = "links.linkForm.drawers.txCart.wallet";

  let failedImageLoads = $state<Set<string>>(new Set());

  function handleImageError(address: string) {
    failedImageLoads.add(address);
  }

  // Use reactive assetAndFeeList
  const assetAndFee = $derived(walletTxCartStore.assetAndFeeList);

  // Derived: true if any asset is in PROCESSING state
  const hasProcessingAssets = $derived.by(() =>
    assetAndFee.some(
      (item) => item.asset.state === AssetProcessState.PROCESSING,
    ),
  );

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
  const totalFeesUsd = $derived.by(() => walletTxCartStore.computeFee());
  const feesBreakdown = $derived.by(() =>
    feeService.buildFeesBreakdownFromAssetAndFeeList(
      assetAndFee,
      walletStore.query.data ?? [],
    ),
  );

  // Handle fee breakdown click - close txCart and show FeeInfoDrawer
  function handleFeeBreakdownClick() {
    if (hasProcessingAssets) return;
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
   * WalletSource returns Result<bigint, string>.
   */
  async function handleConfirm() {
    errorMessage = null;
    successMessage = null;

    try {
      const result = await walletTxCartStore.execute();
      if (result.isOk()) {
        successMessage = locale.t(`${txCartI18nKey}.successMessage`);
        source.onSuccess?.(result.value);
        onCloseDrawer?.();
      } else {
        errorMessage = `${locale.t(`${txCartI18nKey}.errorMessagePrefix`)} ${result.error}`;
      }
    } catch (e) {
      errorMessage = `${locale.t(`${txCartI18nKey}.errorMessagePrefix`)} ${(e as Error).message}`;
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
   * Initialize the store on mount.
   */
  onMount(() => {
    walletTxCartStore.initialize();
  });

  /**
   * Reactively initialize assets when source/tokens change.
   * WalletSource: reinitialize on amount changes from InputAmount.
   */
  $effect(() => {
    if (Object.keys(tokensMap).length > 0) {
      walletTxCartStore.initializeAssets(tokensMap);
    }
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
            {locale.t(`${txCartI18nKey}.title`)}
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
            />
          {/if}

          {#if incomingAssets.length > 0}
            <YouReceiveSection
              assets={incomingAssets}
              {failedImageLoads}
              onImageError={handleImageError}
            />
          {/if}

          {#if totalFeesUsd > 0}
            <FeesBreakdownSection
              {totalFeesUsd}
              onBreakdownClick={handleFeeBreakdownClick}
              disabled={hasProcessingAssets}
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
          disabled={hasProcessingAssets}
        >
          {hasProcessingAssets
            ? locale.t(`${txCartI18nKey}.processingButton`)
            : errorMessage
              ? locale.t(`${txCartI18nKey}.retryButton`)
              : locale.t(`${txCartI18nKey}.confirmButton`)}
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
