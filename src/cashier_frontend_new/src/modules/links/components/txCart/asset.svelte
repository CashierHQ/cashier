<script lang="ts">
  import { tokenMetadataQuery } from "$modules/token/state/tokenStore.svelte";
  import { parseBalanceUnits } from "$modules/shared/utils/converter";
  import loadingGif from "$lib/assets/loading.gif";
  import { Check, X } from "lucide-svelte";
  import type { LinkStore } from "../../state/linkStore.svelte";
  import { ActionType } from "$modules/links/types/action/actionType";

  let {
    link,
    isProcessing,
    successMessage,
    errorMessage,
  }: {
    link: LinkStore;
    isProcessing: boolean;
    successMessage: string | null;
    errorMessage: string | null;
  } = $props();
</script>

{#if link.action && link.action.intents.length > 0}
  <div>
    {#if link.action}
      {@const heading = (() => {
        const t = link.action.type;
        if (t === ActionType.CreateLink) return "You send";
        if (t === ActionType.Withdraw || t === ActionType.Receive)
          return "You receive";
        return "You send";
      })()}
      <h5 class="text-sm font-medium mb-2">{heading}</h5>
    {:else}
      <h5 class="text-sm font-medium mb-2">You send</h5>
    {/if}

    <div class="space-y-3">
      {#each link.getIntentProperties() as intent (intent.id)}
        <div
          class="p-3 border rounded bg-background flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            {#if isProcessing}
              <img src={loadingGif} alt="loading" class="w-6 h-6" />
            {/if}
            {#if successMessage}
              <div class="text-green-600">
                <Check class="w-4 h-4" />
              </div>
            {:else if errorMessage}
              <div class="text-red-600">
                <X class="w-4 h-4" />
              </div>
            {/if}

            <div
              class="w-10 h-10 rounded-full bg-white flex items-center justify-center border"
            >
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
                {tokenMetadataQuery(intent.type.payload.asset.address.toText())
                  .data?.symbol ?? "TOKEN"}
              </div>
              <div class="text-xs text-muted-foreground">
                {tokenMetadataQuery(intent.type.payload.asset.address.toText())
                  .data?.name ?? ""}
              </div>
            </div>
          </div>

          <div class="text-right">
            <div class="font-medium text-lg">
              {parseBalanceUnits(
                intent.type.payload.amount,
                tokenMetadataQuery(intent.type.payload.asset.address.toText())
                  .data?.decimals ?? 8,
              ).toFixed(5)}
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
