<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import * as Drawer from "$lib/shadcn/components/ui/drawer";
  import type Action from "$modules/links/types/action/action";
  import type { ProcessActionResult } from "$modules/links/types/action/action";
  import { getHeadingFromActionType } from "$modules/links/utils/txCart";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import {
    feeService,
    type AssetAndFee,
  } from "$modules/transactionCart/services/feeService";
  import { onMount } from "svelte";
  import { TransactionCartStore } from "../state/txCartStore.svelte";
  import { AssetProcessState } from "../types/txCart";
  import AssetList from "./assetList.svelte";
  import Fee from "./fee.svelte";
  import FeeBreakdown from "./feeBreakdown.svelte";

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

  let assetTitle = $derived.by(() => getHeadingFromActionType(action.type));
  let showFeeBreakdown = $state(false);

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
        successMessage = "Process action completed successfully.";
        onCloseDrawer?.();
      } else {
        errorMessage = `Process action failed: ${processActionResult.errors.join(", ")}`;
      }
    } catch (e) {
      errorMessage = `Process action failed: ${(e as Error).message}`;
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
    <Drawer.Content class="w-full lg:w-1/3">
      <Drawer.Header class="relative">
        <div>
          <Drawer.Title class="text-left">Confirm transaction</Drawer.Title>
          <Drawer.Description class="mt-1 text-sm text-muted-foreground">
            Review and confirm the transaction above.
          </Drawer.Description>
        </div>

        <Drawer.Close>
          <Button
            onclick={onCloseDrawer}
            aria-label="Close"
            class="absolute top-4 right-4 inline-flex items-center justify-center rounded-full w-8 h-8"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        </Drawer.Close>
      </Drawer.Header>

      <div class="px-4 pb-4">
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

          <AssetList title={assetTitle} {assetAndFeeList} />

          {#if assetAndFeeList && assetAndFeeList.length > 0 && assetAndFeeList.some((item) => item.fee)}
            <Fee {assetAndFeeList} onOpen={() => (showFeeBreakdown = true)} />
          {/if}

          <div class="px-4 pb-4 text-sm text-muted-foreground">
            By confirming you agree execute the transaction above and agree to
            the terms of service
          </div>
        {/if}
      </div>

      {#if !showFeeBreakdown}
        <Drawer.Footer>
          <Button
            class="flex gap-2 w-full"
            onclick={handleConfirm}
            disabled={isProcessing}
            variant="default"
          >
            {isProcessing ? "Processing..." : "Confirm"}
          </Button>
        </Drawer.Footer>
      {/if}
    </Drawer.Content>
  </Drawer.Root>
{/if}
