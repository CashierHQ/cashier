<script lang="ts">
  import * as Drawer from "$lib/shadcn/components/ui/drawer";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import type { LinkStore } from "../../state/linkStore.svelte";
  import { authState } from "$modules/auth/state/auth.svelte";
  import Icrc112Service from "$modules/icrc112/services/icrc112Service";
  import type { Signer } from "@slide-computer/signer";
  import type { IITransport } from "$modules/auth/signer/ii/IITransport";
  import { CASHIER_BACKEND_CANISTER_ID } from "$modules/shared/constants";
  import Asset from "./asset.svelte";
  import Fee from "./fee.svelte";

  let {
    link,
    goNext = async () => {},
  }: {
    link: LinkStore;
    goNext?: () => Promise<void> | void;
  } = $props();

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

  let isProcessing: boolean = $state(false);
  let isExecutingIcrc112: boolean = $state(false);
  let isOpen: boolean = $derived(!!link.action);

  // Confirm and process the action
  async function confirmAction() {
    if (!link.action || !link.id) {
      errorMessage = "No action or link ID available";
      return;
    }

    const signer = authState.getSigner() as Signer<IITransport> | null;
    if (!signer) {
      errorMessage = "No signer available for authentication.";
      return;
    }

    // Start processing only after basic checks passed
    isProcessing = true;
    errorMessage = null;
    successMessage = null;

    try {
      if (!authState.account?.owner) {
        errorMessage = "You are not authorized to confirm this action.";
        return;
      }

      const requests = link.action.icrc_112_requests ?? [];

      // Only attempt ICRC-112 batch if requests exist
      if (requests.length > 0) {
        try {
          isExecutingIcrc112 = true;
          const icrc112Service = new Icrc112Service(signer);
          const batchResult = await icrc112Service.sendBatchRequest(
            requests,
            authState.account.owner,
            CASHIER_BACKEND_CANISTER_ID,
          );

          if (batchResult.isOk()) {
            console.log("Batch request successful:", batchResult.unwrap());
            successMessage = "ICRC-112 batch request sent successfully";
          } else {
            const err = batchResult.unwrapErr();
            console.error("Batch request failed:", err);
            errorMessage = `Batch request failed: ${err?.message ?? String(err)}`;
          }
        } catch (err) {
          console.error("Error sending ICRC-112 batch request:", err);
          errorMessage = `Error sending ICRC-112 batch request: ${err instanceof Error ? err.message : String(err)}`;
        } finally {
          isExecutingIcrc112 = false;
        }
      }

      // Always attempt to proceed to the next step regardless of whether ICRC-112 ran or failed
      try {
        await goNext();
      } catch (e) {
        console.error("goNext threw an error:", e);
        const msg = e instanceof Error ? e.message : String(e);
        // append goNext error to any existing errorMessage
        errorMessage = errorMessage
          ? `${errorMessage}; goNext error: ${msg}`
          : msg;
      }
    } catch (error) {
      console.error("Error processing action:", error);
      isProcessing = false;
      errorMessage = `Error processing action: ${error instanceof Error ? error.message : String(error)}`;
    }
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

        <Asset
          {link}
          isProcessing={isExecutingIcrc112}
          {successMessage}
          {errorMessage}
        />

        <Fee />
      </div>
      <!-- end of MOVE TO fee.svelte -->

      <div class="px-4 pb-4 text-sm text-muted-foreground">
        By confirming you agree execute the transaction above and agree to the
        terms of service
      </div>

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
    </Drawer.Content>
  </Drawer.Root>
{/if}
