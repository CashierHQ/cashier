<script lang="ts">
  import { ChevronDown } from "lucide-svelte";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";

  type Props = {
    selectedToken?: TokenWithPriceAndBalance | null;
    showInput?: boolean;
    onOpenDrawer?: () => void;
  };

  let { selectedToken, showInput = true, onOpenDrawer }: Props = $props();

  let imageLoadFailed = $state(false);
  let previousTokenAddress = $state<string | null>(null);

  // Get token logo URL based on token address
  const tokenLogo = $derived(
    selectedToken ? getTokenLogo(selectedToken.address) : null,
  );

  // Reset image load failed state only when token address actually changes
  $effect(() => {
    if (selectedToken) {
      const currentAddress = selectedToken.address;
      // Only reset if the address actually changed, not just the object reference
      if (previousTokenAddress !== currentAddress) {
        imageLoadFailed = false;
        previousTokenAddress = currentAddress;
      }
    } else {
      previousTokenAddress = null;
    }
  });

  function handleImageError() {
    imageLoadFailed = true;
  }

  function handleOpenDrawerClick(e: MouseEvent) {
    e.stopPropagation();
    onOpenDrawer?.();
  }

  function handleOpenDrawerKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      onOpenDrawer?.();
    }
  }
</script>

{#if selectedToken}
  <div class="flex font-normal flex-grow items-center w-fit w-full">
    <div
      class="relative flex shrink-0 overflow-hidden rounded-full mr-2 w-6 h-6"
    >
      {#key `${selectedToken.address}-${imageLoadFailed}`}
        {#if tokenLogo && !imageLoadFailed}
          <img
            alt={selectedToken.symbol}
            class="w-full h-full object-cover rounded-full"
            src={tokenLogo}
            onerror={handleImageError}
          />
        {:else}
          <div
            class="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-xs"
          >
            {selectedToken.symbol[0]?.toUpperCase() || "?"}
          </div>
        {/if}
      {/key}
    </div>
    <div
      id="asset-info"
      class="text-left flex sm:gap-3 gap-1 w-full leading-none items-center cursor-pointer"
      role="button"
      tabindex="0"
      onclick={handleOpenDrawerClick}
      onkeydown={handleOpenDrawerKeyDown}
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
