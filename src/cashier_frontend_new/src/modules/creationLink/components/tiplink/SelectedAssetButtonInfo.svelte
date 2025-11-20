<script lang="ts">
  import { ChevronDown } from "lucide-svelte";
  import { PUBLIC_TOKEN_ICP_LEDGER_CANISTER_ID } from "./auth.svelte.js";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";

  type Props = {
    selectedToken?: TokenWithPriceAndBalance | null;
    showInput?: boolean;
    onOpenDrawer?: () => void;
  };

  let { selectedToken, showInput = true, onOpenDrawer }: Props = $props();

  let imageLoadFailed = $state(false);

  // Get token logo URL based on token address
  const tokenLogo = $derived.by(() => {
    if (!selectedToken) return null;

    const address = selectedToken.address;

    // Special case for ICP
    if (address === PUBLIC_TOKEN_ICP_LEDGER_CANISTER_ID) {
      return "/icpLogo.png";
    }

    // Use icexplorer API for all other tokens
    return `https://api.icexplorer.io/images/${address}`;
  });

  // Reset image load failed state when token changes
  $effect(() => {
    if (selectedToken) {
      imageLoadFailed = false;
    }
  });
</script>

{#if selectedToken}
  <div class="flex font-normal flex-grow items-center w-fit w-full">
    <div
      class="relative flex shrink-0 overflow-hidden rounded-full mr-2 w-6 h-6"
    >
      {#if tokenLogo && !imageLoadFailed}
        <img
          alt={selectedToken.symbol}
          class="w-full h-full object-cover rounded-full"
          src={tokenLogo}
          onerror={() => {
            imageLoadFailed = true;
          }}
        />
      {:else}
        <div
          class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-xs"
        >
          {selectedToken.symbol[0]?.toUpperCase() || "?"}
        </div>
      {/if}
    </div>
    <div
      id="asset-info"
      class="text-left flex sm:gap-3 gap-1 w-full leading-none items-center cursor-pointer"
      role="button"
      tabindex="0"
      onclick={(e) => {
        e.stopPropagation();
        onOpenDrawer?.();
      }}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onOpenDrawer?.();
        }
      }}
    >
      <div
        class="text-[14px] font-normal whitespace-nowrap overflow-hidden text-ellipsis"
      >
        {selectedToken.name}
      </div>
      <ChevronDown
        color="#36A18B"
        stroke-width={2}
        size={22}
        class={showInput ? "" : "ml-auto" + " min-w-[22px]"}
      />
    </div>
  </div>
{/if}
