<script lang="ts">
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import type { LinkStore } from "../../state/linkStore.svelte";
  import { cashierBackendService } from "../../services/cashierBackend";
  import Action from "../../types/action/action";

  const {
    link,
  }: {
    link: LinkStore;
  } = $props();

  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

  let isProcessing: boolean = $state(false);

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

      const result = await cashierBackendService.processAction(
        link.id,
        link.action.id,
        link.action.type
      );

      if (result.isOk()) {
        // Update the action with the processed result
        const actionDto = result.unwrap();
        link.action = Action.fromBackendType(actionDto);
        console.log("Action processed successfully:", actionDto);
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
  <div class="mt-6 p-4 border rounded-lg bg-muted/50">
    <h4 class="text-md font-medium mb-3">Transaction Cart</h4>
    
    {#if errorMessage}
      <div class="mb-3 p-2 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
        {errorMessage}
      </div>
    {/if}
    
    {#if successMessage}
      <div class="mb-3 p-2 bg-green-100 border border-green-300 text-green-700 rounded text-sm">
        {successMessage}
      </div>
    {/if}
    
    <div class="space-y-2 text-sm">
      <div>
        <span class="font-medium">Action ID:</span> {link.action.id}
      </div>
      <div>
        <span class="font-medium">Total Intents:</span> {link.action.intents.length}
      </div>
    </div>
    
    {#if link.action.intents.length > 0}
      <div class="mt-4">
        <h5 class="text-sm font-medium mb-2">Intents:</h5>
        <div class="space-y-3">
          {#each link.getIntentProperties() as intent}
            <div class="p-3 border rounded bg-background">
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div><span class="font-medium">ID:</span> {intent.id}</div>
                <div><span class="font-medium">State:</span> {intent.state.id}</div>
                <div><span class="font-medium">Created:</span> {intent.createdAt}</div>
                <div><span class="font-medium">task:</span> {intent.task.id}</div>
              </div>
                <div class="mt-2 text-xs">
                  <span class="font-medium">Type:</span>
                  <pre class="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">{intent.type.payload.amount}</pre>
                </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="flex gap-2 mt-4">
      <Button 
        onclick={confirmAction} 
        disabled={isProcessing}
        variant="default"
      >
        {isProcessing ? "Processing..." : "Confirm Action"}
      </Button>
    </div>
  </div>
{/if}