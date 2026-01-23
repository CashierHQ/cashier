/**
 * ImageCache module - centralized token image caching
 *
 * This module provides:
 * - Token image caching (data URLs)
 * - Image loading with fetch/FileReader (supports octet-stream, SVG, PNG, etc.)
 * - TokenIcon component for displaying token images with caching
 * - Integration with walletStore for reactive cache updates
 */

// Export components
export { default as TokenIcon } from "./components/TokenIcon.svelte";

// Export utilities
export {
  getCachedTokenImage,
  isImageLoading,
  loadTokenImage,
  loadTokenImages,
  clearCache,
  clearAllCache,
  getCacheSize,
} from "./utils/imageCache";

export { getTokenLogo } from "./utils/getTokenLogo";

export {
  isImagePreloaded,
  getPreloadedImage,
  getCachedImageDataUrl,
  preloadTokenImage,
  preloadTokenImages,
  preloadTokenImagesIdle,
} from "./utils/preloadTokenImage";

// Export types
export type { ImageCacheEntry, ImageLoadOptions } from "./types";
