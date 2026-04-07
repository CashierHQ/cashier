<script lang="ts">
  import { getTokenLogo, getCachedTokenImage } from "../utils";

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

  /**
   * Local state is required because parent `failedImageLoads` is often a `Set`.
   * Mutating a `Set` in-place doesn't always trigger Svelte reactivity upstream,
   * which can leave a broken <img> rendered forever. We still call `onImageError`
   * so parents can cache failures, but we also switch to fallback immediately.
   */
  let localFailed = $state(false);
  let loaded = $state(false);

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
  const sizeClass = $derived(sizeClasses[size] || size);

  // Get text size class
  const textSizeClass = $derived(textSizeClasses[size] || "text-xs");

  // Get logo URL - check ImageCache first, then fallback to external URL
  // Priority: 1) logo prop, 2) ImageCache, 3) external URL
  // This ensures we use cached images when available and only load from external source if not cached
  const imageSrc = $derived.by(() => {
    // If logo prop is provided, use it (it might already be a cached data URL from parent)
    if (logo) {
      return logo;
    }

    // First, check ImageCache - this will return cached data URL if available
    const cachedImage = getCachedTokenImage(address);
    if (cachedImage) {
      // If cached image is a data URL, use it directly (no network request)
      return cachedImage;
    }

    // If not in cache, get external URL (will trigger network request)
    // This should only happen if image hasn't been loaded into cache yet
    return getTokenLogo(address, true); // Use skipStore to get original URL
  });

  // Check if image failed to load
  const hasFailed = $derived(localFailed || failedImageLoads.has(address));

  function handleImageError() {
    localFailed = true;
    onImageError(address);
  }

  function handleImageLoad() {
    loaded = true;
  }

  // Get fallback text - use custom fallbackText or first letter of symbol
  const fallbackDisplay = $derived(
    fallbackText || symbol[0]?.toUpperCase() || "?",
  );
</script>

<div class="relative {sizeClass} {className}">
  {#if hasFailed || !loaded}
    <div
      class="absolute inset-0 bg-gray-200 flex rounded-full items-center justify-center {textSizeClass} overflow-hidden"
    >
      {fallbackDisplay}
    </div>
  {/if}

  {#if !hasFailed}
    <img
      src={imageSrc}
      alt={symbol}
      class="absolute inset-0 w-full h-full rounded-full overflow-hidden object-cover {loaded
        ? 'opacity-100'
        : 'opacity-0'}"
      onerror={handleImageError}
      onload={handleImageLoad}
    />
  {/if}
</div>
