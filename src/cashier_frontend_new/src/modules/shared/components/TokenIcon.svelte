<script lang="ts">
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import { walletStore } from "$modules/token/state/walletStore.svelte";

  type Props = {
    address: string;
    symbol: string;
    logo?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl" | string;
    failedImageLoads: Set<string> | { has: (key: string) => boolean };
    onImageError: (address: string) => void;
    class?: string;
    fallbackText?: string; // Custom fallback text (e.g., first 2 letters)
  };

  let {
    address,
    symbol,
    logo,
    size = "sm",
    failedImageLoads,
    onImageError,
    class: className = "",
    fallbackText,
  }: Props = $props();

  // Size mapping
  const sizeClasses: Record<string, string> = {
    xs: "w-4 h-4",
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-9 h-9",
    xl: "w-10 h-10",
  };

  // Text size mapping based on icon size
  const textSizeClasses: Record<string, string> = {
    xs: "text-[10px]",
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  };

  // Get size class - use predefined or custom
  const sizeClass = sizeClasses[size] || size;

  // Get text size class
  const textSizeClass = textSizeClasses[size] || "text-xs";

  // Get logo URL - reactively check walletStore cache first
  // Priority: 1) logo prop, 2) walletStore cache, 3) external URL
  // This ensures we use cached images when available and only load from external source if not cached
  const imageSrc = $derived.by(() => {
    // If logo prop is provided, use it (it might already be a cached data URL from parent)
    if (logo) {
      return logo;
    }

    // First, check walletStore cache reactively - this will update when images are loaded
    // Access the cache directly to make it reactive
    const cachedImage = walletStore.getTokenImage(address);
    if (cachedImage) {
      // If cached image is a data URL, use it directly (no network request)
      // If it's an original URL, browser cache should handle it
      return cachedImage;
    }

    // If not in cache, get external URL (will trigger network request)
    // This should only happen if image hasn't been loaded into cache yet
    return getTokenLogo(address, true); // Use skipStore to get original URL
  });

  // Check if image failed to load
  const hasFailed = $derived(failedImageLoads.has(address));

  function handleImageError() {
    onImageError(address);
  }

  // Get fallback text - use custom fallbackText or first letter of symbol
  const fallbackDisplay = $derived(
    fallbackText || symbol[0]?.toUpperCase() || "?",
  );
</script>

{#if !hasFailed}
  <img
    src={imageSrc}
    alt={symbol}
    class="{sizeClass} overflow-hidden {className}"
    onerror={handleImageError}
  />
{:else}
  <div
    class="{sizeClass} bg-gray-200 flex rounded-full items-center justify-center {textSizeClass} overflow-hidden {className}"
  >
    {fallbackDisplay}
  </div>
{/if}
