/**
 * ImageCache utilities
 */

export {
  getCachedTokenImage,
  isImageLoading,
  loadTokenImage,
  loadTokenImages,
  clearCache,
  clearAllCache,
  getCacheSize,
} from "$modules/imageCache/utils/imageCache";

export { getTokenLogo } from "$modules/imageCache/utils/getTokenLogo";

export {
  isImagePreloaded,
  getPreloadedImage,
  getCachedImageDataUrl,
  preloadTokenImage,
  preloadTokenImages,
  preloadTokenImagesIdle,
} from "$modules/imageCache/utils/preloadTokenImage";
