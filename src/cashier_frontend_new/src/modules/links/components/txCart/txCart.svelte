<script lang="ts">
  import * as Drawer from "$lib/shadcn/components/ui/drawer";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import type { LinkStore } from "../../state/linkStore.svelte";
  import { authState } from "$modules/auth/state/auth.svelte";
  import Icrc112Service from "$modules/icrc112/services/icrc112Service";
  import type { Signer } from "@slide-computer/signer";
  import type { IITransport } from "$modules/auth/signer/ii/IITransport";
  import { CASHIER_BACKEND_CANISTER_ID } from "$modules/shared/constants";
  import AssetList from "./assetList.svelte";
  import Fee from "./fee.svelte";
  import FeeBreakdown from "./feeBreakdown.svelte";
  import { getHeadingFromActionType } from "./utils";
  import { AssetProcessState } from "./type";
  import { FeeService } from "$modules/fee/services";
  import { walletStore } from "$modules/token/state/walletStore.svelte";
  import type { FeeItem } from "$modules/fee/type";

  let {
    link,
    isOpen,
    goNext = async () => {},
    onCloseDrawer,
  }: {
    link: LinkStore;
    isOpen: boolean;
    goNext?: () => Promise<void> | void;
    onCloseDrawer?: () => void;
  } = $props();

  const service = new FeeService();

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

  let isProcessing: boolean = $state(false);
  let isExecutingIcrc112: boolean = $state(false);

  let isProcessingAsset = $derived(() => {
    if (link.action?.icrc_112_requests?.length === 0) {
      return isProcessing;
    }
    return isExecutingIcrc112;
  });

  const assetAndFeeList = $derived.by(() =>
    link.action
      ? service.mapActionToAssetAndFeeList(
          link.action,
          // build a record keyed by token address for the service
          Object.fromEntries(
            (walletStore.query.data ?? []).map((t) => [t.address, t]),
          ),
        )
      : [],
  );

  // Derive asset items from the action, but override each item's state based on
  // the current processing / error / success UI state so the UI (AssetItem)
  // shows the correct status icons.
  let assetItems = $derived.by(() => {
    return assetAndFeeList.map(({ asset }) => {
      if (isProcessingAsset()) {
        asset.state = AssetProcessState.PROCESSING;
      } else if (errorMessage) {
        asset.state = AssetProcessState.FAILED;
      } else if (successMessage) {
        asset.state = AssetProcessState.SUCCEED;
      } else {
        // default to whatever the mapper produced or PENDING if missing
        asset.state = asset.state ?? AssetProcessState.PENDING;
      }
      return asset;
    });
  });
  let linkFees: FeeItem[] = $derived.by(() =>
    assetAndFeeList.map(({ fee }) => fee).filter((f): f is FeeItem => !!f),
  );

  let assetTitle = $derived.by(() =>
    getHeadingFromActionType(link.action?.type),
  );

  let showFeeBreakdown = $state(false);

  // Confirm and process the action
  // first execute icrc-112 requests if any, then call goNext
  // in case execute icrc-112 fails, do not call goNext
  async function confirmAction() {
    // Basic validation BEFORE starting processing UI state
    if (!link.action || !link.id) {
      errorMessage = "No action or link ID available";
      return;
    }

    const signer = authState.getSigner() as Signer<IITransport> | null;
    if (!signer) {
      errorMessage = "No signer available for authentication.";
      return;
    }

    if (!authState.account?.owner) {
      errorMessage = "You are not authorized to confirm this action.";
      return;
    }

    // Now mark processing started and clear messages
    isProcessing = true;
    errorMessage = null;
    successMessage = null;

    const requests = link.action.icrc_112_requests ?? [];

    // Execute ICRC-112 batch only if there are requests.
    if (requests.length > 0) {
      isExecutingIcrc112 = true;
      try {
        const icrc112Service = new Icrc112Service(signer);
        const batchResult = await icrc112Service.sendBatchRequest(
          requests,
          authState.account.owner,
          CASHIER_BACKEND_CANISTER_ID,
        );

        if (!batchResult.isOk()) {
          const err = batchResult.unwrapErr();
          console.error("Batch request failed:", err);
          errorMessage = `Batch request failed: ${err?.message ?? String(err)}`;
          // Do not proceed to goNext if batch failed (matches comment)
          return;
        }

        console.log("Batch request successful:", batchResult.unwrap());
        successMessage = "ICRC-112 batch request sent successfully";
      } catch (err) {
        console.error("Error sending ICRC-112 batch request:", err);
        errorMessage = `Error sending ICRC-112 batch request: ${err instanceof Error ? err.message : String(err)}`;
        return;
      } finally {
        isExecutingIcrc112 = false;
      }
    }

    // Only reaches here if batch succeeded or there were no requests
    try {
      await goNext();
    } catch (e) {
      console.error("goNext threw an error:", e);
      const msg = e instanceof Error ? e.message : String(e);
      errorMessage = errorMessage
        ? `${errorMessage}; goNext error: ${msg}`
        : msg;
    }
    isProcessing = false;
  }

  // Continue to next step after success
</script>

{#if link.action}
  <Drawer.Root bind:open={isOpen}>
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
            fees={linkFees}
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

          <AssetList title={assetTitle} {assetItems} />

          {#if linkFees && linkFees.length > 0}
            <Fee fees={linkFees} onOpen={() => (showFeeBreakdown = true)} />
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
            onclick={confirmAction}
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
