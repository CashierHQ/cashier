<script lang="ts">
  import { ChevronDown } from "lucide-svelte";
  import type { TokenWithPriceAndBalance } from "$modules/token/types";
  import { getTokenLogo, TokenIcon } from "$modules/imageCache";

  type Props = {
    selectedToken?: TokenWithPriceAndBalance | null;
    showInput?: boolean;
    onOpenDrawer?: () => void;
  };

  let { selectedToken, showInput = true, onOpenDrawer }: Props = $props();

  // Track failed image loads using Set for compatibility with TokenIcon
  let failedImageLoads = $state<Set<string>>(new Set());

  function handleImageError(address: string) {
    failedImageLoads.add(address);
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
    <div class="relative flex shrink-0 mr-2">
      <TokenIcon
        address={selectedToken.address}
        symbol={selectedToken.symbol}
        logo={getTokenLogo(selectedToken.address)}
        size="md"
        {failedImageLoads}
        onImageError={handleImageError}
      />
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
        class="text-[14px] font-normal leading-[1.1] whitespace-nowrap overflow-hidden text-ellipsis"
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
