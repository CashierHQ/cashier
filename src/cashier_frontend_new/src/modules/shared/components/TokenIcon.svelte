<script lang="ts">
  import { getTokenLogo } from "$modules/shared/utils/getTokenLogo";
  import { getCachedImageDataUrl } from "$modules/shared/utils/preloadTokenImage";

  type Props = {
    address: string;
    symbol: string;
    logo?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl" | string;
    failedImageLoads: Set<string>;
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

  // Get logo URL
  const logoUrl = $derived(logo || getTokenLogo(address));

  // Check if image failed to load
  const hasFailed = $derived(failedImageLoads.has(address));

  // Try to get cached data URL - if it exists, use it to prevent re-fetching
  const cachedDataUrl = $derived(getCachedImageDataUrl(logoUrl));
  // const isPreloaded = $derived(isImagePreloaded(logoUrl));

  // Use cached data URL if available, otherwise use original URL
  const imageSrc = $derived(cachedDataUrl || logoUrl);

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
