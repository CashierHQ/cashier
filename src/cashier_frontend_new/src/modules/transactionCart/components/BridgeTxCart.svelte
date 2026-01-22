<script lang="ts">
  import { locale } from "$lib/i18n";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import * as Drawer from "$lib/shadcn/components/ui/drawer";
  import FeeInfoDrawer from "$modules/creationLink/components/drawers/FeeInfoDrawer.svelte";
  import FeesBreakdownSection from "$modules/creationLink/components/previewSections/FeesBreakdownSection.svelte";
  import YouReceiveSection from "$modules/transactionCart/components/shared/YouReceiveSection.svelte";
  import YouSendSection from "$modules/transactionCart/components/shared/YouSendSection.svelte";
  import { BridgeTxCartStore } from "$modules/transactionCart/state/bridgeTxCartStore.svelte";
  import {
      type BridgeSource
  } from "$modules/transactionCart/types/transactionSource";
  import { X } from "lucide-svelte";
  import { onMount } from 'svelte';

  let {
    source,
    isOpen = $bindable(false),
    onCloseDrawer,
  }: {
    source: BridgeSource;
    isOpen: boolean;
    onCloseDrawer: () => void;
  } = $props();

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let bridgeTxCartStore = $state<BridgeTxCartStore | null>(null);

  let showFeeInfoDrawer = $state(false);

  // Hardcoded i18n key for bridge source
  const txCartI18nKey = "links.linkForm.drawers.txCart.bridge";

  let failedImageLoads = $state<Set<string>>(new Set());

  let outgoingAssets = $derived.by(() => bridgeTxCartStore?.outgoingAssets ?? []);
  let incomingAssets = $derived.by(() => bridgeTxCartStore?.incomingAssets ?? []);

  const totalFeesUsd = $derived.by(() => bridgeTxCartStore?.totalFeesUsd ?? 0);
  const feesBreakdown = $derived.by(() =>
    bridgeTxCartStore?.feeItems ?? [],
  );

  // Handle fee breakdown click - close txCart and show FeeInfoDrawer
  function handleFeeBreakdownClick() {
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
    onCloseDrawer();
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

  function handleImageError(address: string) {
    failedImageLoads.add(address);
  }

  onMount(() => {
    console.log("BridgeTxCart mounted with bridge id:", source.bridge.bridge_id);
    bridgeTxCartStore = new BridgeTxCartStore(
      source.bridge.bridge_id,
    );
    bridgeTxCartStore.initialize();
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
            />
          {/if}
        </div>
      </div>

      <div class="px-3 mb-2">
        <Button
          class="rounded-full inline-flex items-center justify-center cursor-pointer whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none bg-green text-primary-foreground shadow hover:bg-green/90 h-[44px] px-4 w-full disabled:bg-disabledgreen"
          onclick={handleConfirm}
        >
          {locale.t(`${txCartI18nKey}.close`)}
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
