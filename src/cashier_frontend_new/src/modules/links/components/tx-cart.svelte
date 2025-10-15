<script lang="ts">
  import * as Drawer from "$lib/shadcn/components/ui/drawer";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import { tokenMetadataQuery } from "$modules/token/state/tokenStore.svelte";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import type { LinkStore } from "../state/linkStore.svelte";
  import { cashierBackendService } from "../services/cashierBackend";
  import Action from "../types/action/action";
  import { authState } from "$modules/auth/state/auth.svelte";

  const {
    link,
  }: {
    link: LinkStore;
  } = $props();

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

  let isProcessing: boolean = $state(false);
  let isOpen: boolean = $state(false);

  // Automatically open the drawer when an action is present (Svelte 5 $effect rune)
  $effect(() => {
    isOpen = !!link.action;
  });

  // Confirm and process the action
  async function confirmAction() {
    if (!link.action || !link.id) {
      errorMessage = "No action or link ID available";
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

      const result = await cashierBackendService.processAction(
        link.id,
        link.action.id,
        link.action.type,
      );

      if (result.isOk()) {
        // Update the action with the processed result
        const actionDto = result.unwrap();
        link.action = Action.fromBackendType(actionDto);

        // Send ICRC-112 batch request using auth service
        if (
          link.action.icrc_112_requests &&
          link.action.icrc_112_requests.length > 0
        ) {
          const batchResult = await authState.sendBatchRequest(
            link.action.icrc_112_requests,
          );

          if (batchResult.isOk()) {
            const res = await cashierBackendService.updateAction({
              action_id: link.action.id,
              link_id: link.id,
            });

            if (res.isOk()) {
              const updatedActionDto = res.unwrap();
              link.action = Action.fromBackendType(updatedActionDto);
              successMessage = "ICRC-112 batch request sent successfully";
            } else {
              const error = res.unwrapErr();
              console.error(
                "Failed to update action after batch request:",
                error,
              );
              errorMessage = `Failed to update action: ${error.message}`;
              return;
            }
          } else {
            const error = batchResult.unwrapErr();
            console.error("Batch request failed:", error);
            errorMessage = `Batch request failed: ${error.message}`;
          }
        } else {
          errorMessage = "No ICRC-112 requests available in this action";
        }
      } else {
        errorMessage = `Failed to process action: ${result.unwrapErr().message}`;
      }
    } catch (error) {
      console.error("Error processing action:", error);
      errorMessage = `Error processing action: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      isProcessing = false;
    }
  }
</script>

{#if link.action}
  <Drawer.Root bind:open={isOpen}>
    <Drawer.Content>
      <Drawer.Header>
        <Drawer.Title>Transaction Cart</Drawer.Title>
        <Drawer.Description
          >Review and confirm the transaction intents for this action.</Drawer.Description
        >
      </Drawer.Header>

      <div class="p-4">
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

        <div class="space-y-2 text-sm">
          <div>
            <span class="font-medium">Action ID:</span>
            {link.action.id}
          </div>
          <div>
            <span class="font-medium">Total Intents:</span>
            {link.action.intents.length}
          </div>
        </div>

        {#if link.action.intents.length > 0}
          <div class="mt-4">
            <h5 class="text-sm font-medium mb-2">Intents:</h5>
            <div class="space-y-3">
              {#each link.getIntentProperties() as intent (intent.id)}
                <div class="p-3 border rounded bg-background">
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span class="font-medium">State:</span>
                      {intent.state.id}
                    </div>
                    <div>
                      <span class="font-medium">task:</span>
                      {intent.task.id}
                    </div>
                    <div>
                      <span class="font-medium">Amount:</span>
                      {parseBalanceUnits(
                        intent.type.payload.amount,
                        tokenMetadataQuery(
                          intent.type.payload.asset.address.toText(),
                        ).data?.decimals ?? 8,
                      ).toFixed(5)}
                      {" "}
                      {tokenMetadataQuery(
                        intent.type.payload.asset.address.toText(),
                      ).data?.symbol ?? ""}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <Drawer.Footer>
        <div class="flex gap-2 w-full">
          <Button
            onclick={confirmAction}
            disabled={isProcessing}
            variant="default"
          >
            {isProcessing ? "Processing..." : "Confirm Action"}
          </Button>

          <Drawer.Close>
            <Button variant="ghost">Cancel</Button>
          </Drawer.Close>
        </div>
      </Drawer.Footer>
    </Drawer.Content>
  </Drawer.Root>
{/if}
