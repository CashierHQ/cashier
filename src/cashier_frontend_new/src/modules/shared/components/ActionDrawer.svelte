<script lang="ts">
  import * as Drawer from "$lib/shadcn/components/ui/drawer/index.js";
  import Button from "$lib/shadcn/components/ui/button/button.svelte";
  import TokenAvatar from "./TokenAvatar.svelte";
  import type { Action } from "../../links/types/action/action";
  import { enrichIntents } from "../utils/enrichIntents";

  // bindable props
  let { action = $bindable(), open = $bindable(false), onOpenChange }:
    { action: Action; open?: boolean; onOpenChange?: (open: boolean) => void } = $props();

  // Derive enriched intents from action
  const enrichedIntents = $derived(enrichIntents(action));

  function handleOpenChange(isOpen: boolean) {
    open = isOpen;
    onOpenChange?.(isOpen);
  }
</script>
<Drawer.Root {open} onOpenChange={handleOpenChange}>
  <Drawer.Content>
    <Drawer.Header>
      <Drawer.Title>Confirm transaction</Drawer.Title>
    </Drawer.Header>
    
    <div class="p-6">
      {#if enrichedIntents.enrichedIntents.length > 0}
        <div>
          <h4 class="text-sm font-medium">You send</h4>

          <div class="mt-3 space-y-3 border rounded-lg p-3 bg-white">
            {#each enrichedIntents.enrichedIntents as enrichedIntent}
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <TokenAvatar symbol={enrichedIntent.tokenSymbol} />
                  <div>
                    <div class="text-sm font-medium">
                      {enrichedIntent.tokenSymbol}
                      {#if enrichedIntent.feeType}
                        <span class="ml-2 text-xs text-gray-500">{enrichedIntent.feeType}</span>
                      {/if}
                    </div>
                  </div>
                </div>

                <div class="text-right">
                  <div class="font-medium">{enrichedIntent.formatedAmount}</div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Total fees (mocked as sum of intents) -->
        <div class="mt-6">
          <h4 class="text-sm font-medium">Total fees</h4>
          <div class="mt-3 border rounded-lg p-3 bg-white flex items-center justify-between">
            <div class="flex items-center gap-3">
              <TokenAvatar symbol="ICP" />
              <div class="text-sm">ICP</div>
            </div>
          </div>
        </div>
      {:else}
        <div class="p-4 text-center text-gray-500">No transaction data available</div>
      {/if}
    </div>

    <Drawer.Footer>
      {#if enrichedIntents.enrichedIntents.length > 0}
        <Button class="w-full">Confirm</Button>
      {/if}
      <Drawer.Close class="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 bg-background shadow-xs hover:bg-accent hover:text-accent-foreground border h-9 px-4 py-2 w-full">
        Cancel
      </Drawer.Close>
    </Drawer.Footer>
  </Drawer.Content>
</Drawer.Root>
