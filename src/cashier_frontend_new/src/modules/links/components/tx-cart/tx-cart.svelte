<script lang="ts">
  import * as Drawer from "$lib/shadcn/components/ui/drawer";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { tokenMetadataQuery } from "$modules/token/state/tokenStore.svelte";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import type { LinkStore } from "../../state/linkStore.svelte";
  import { authState } from "$modules/auth/state/auth.svelte";
  import loadingGif from "$lib/assets/loading.gif";
  import { Check, X } from "lucide-svelte";
  import Icrc112Service from "$modules/auth/services/icrc112Service";
  import type { Signer } from "@slide-computer/signer";
  import type { IITransport } from "$modules/auth/signer/ii/IITransport";
    import { CASHIER_BACKEND_CANISTER_ID } from "$modules/shared/constants";

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

    try {
      isProcessing = true;
      errorMessage = null;
      successMessage = null;

      if (!authState.account?.owner) {
        errorMessage = "You are not authorized to confirm this action.";
        return;
      }
      if (
        link.action.icrc_112_requests &&
        link.action.icrc_112_requests.length > 0
      ) {
        const icrc112Service = new Icrc112Service(
          signer,
        );
        const batchResult = await icrc112Service.sendBatchRequest(
          link.action.icrc_112_requests,
          authState.account.owner,
          CASHIER_BACKEND_CANISTER_ID
        );

        if (batchResult.isOk()) {
          console.log("Batch request successful:", batchResult.unwrap());
          successMessage = "ICRC-112 batch request sent successfully";
          return;
        } else {
          const error = batchResult.unwrapErr();
          console.error("Batch request failed:", error);
          errorMessage = `Batch request failed: ${error.message}`;
        }
      } else {
        errorMessage = "No ICRC-112 requests available in this action";
      }
    } catch (error) {
      console.error("Error processing action:", error);
      errorMessage = `Error processing action: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      isProcessing = false;
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
        {#if link.action.intents.length > 0}
          <div>
            <h5 class="text-sm font-medium mb-2">You send</h5>
            <div class="space-y-3">
              {#each link.getIntentProperties() as intent (intent.id)}
                <div
                  class="p-3 border rounded bg-background flex items-center justify-between"
                >
                  <div class="flex items-center gap-3">
                    {#if isProcessing}
                      <img src={loadingGif} alt="loading" class="w-6 h-6" />
                    {/if}

                    <!-- status icon (small) -->
                    {#if successMessage}
                      <div class="text-green-600">
                        <Check class="w-4 h-4" />
                      </div>
                    {:else if errorMessage}
                      <div class="text-red-600">
                        <X class="w-4 h-4" />
                      </div>
                    {/if}

                    <!-- token avatar / placeholder -->
                    <div
                      class="w-10 h-10 rounded-full bg-white flex items-center justify-center border"
                    >
                      <!-- simple gradient circle placeholder -->
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="12" cy="12" r="10" fill="url(#g)" />
                        <defs>
                          <linearGradient id="g" x1="0" x2="1">
                            <stop offset="0" stop-color="#FF6B6B" />
                            <stop offset="1" stop-color="#845EC2" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <div class="text-sm">
                      <div class="font-medium">
                        {tokenMetadataQuery(
                          intent.type.payload.asset.address.toText(),
                        ).data?.symbol ?? "TOKEN"}
                      </div>
                      <div class="text-xs text-muted-foreground">
                        {tokenMetadataQuery(
                          intent.type.payload.asset.address.toText(),
                        ).data?.name ?? ""}
                      </div>
                    </div>
                  </div>

                  <div class="text-right">
                    <div class="font-medium text-lg">
                      {parseBalanceUnits(
                        intent.type.payload.amount,
                        tokenMetadataQuery(
                          intent.type.payload.asset.address.toText(),
                        ).data?.decimals ?? 8,
                      ).toFixed(5)}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Total fees card -->
        <div class="mt-4">
          <h5 class="text-sm font-medium mb-2">Total fees</h5>
          <div
            class="p-3 border rounded bg-background flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-full bg-white flex items-center justify-center border"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="10" fill="url(#g2)" />
                  <defs>
                    <linearGradient id="g2" x1="0" x2="1">
                      <stop offset="0" stop-color="#00C9A7" />
                      <stop offset="1" stop-color="#845EC2" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-4 pb-4 text-sm text-muted-foreground">
        By confirming you agree execute the transaction above and agree to the
        terms of service
      </div>

      <Drawer.Footer>
        {#if successMessage}
          <Button class="flex gap-2 w-full" onclick={goNext} variant="default">
            Continue
          </Button>
        {:else}
          <Button
            class="flex gap-2 w-full"
            onclick={confirmAction}
            disabled={isProcessing}
            variant="default"
          >
            {isProcessing ? "Processing..." : "Confirm"}
          </Button>
        {/if}
      </Drawer.Footer>
    </Drawer.Content>
  </Drawer.Root>
{/if}
