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
  isTokenImageFailed,
  markTokenImageFailed,
} from "$modules/imageCache/utils/imageCache";

export {
  getResolvedTokenLogo,
  getTokenLogo,
  normalizeTokenMetadataIcon,
} from "$modules/imageCache/utils/getTokenLogo";

export {
  isImagePreloaded,
  getPreloadedImage,
  getCachedImageDataUrl,
  preloadTokenImage,
  preloadTokenImages,
  preloadTokenImagesIdle,
} from "$modules/imageCache/utils/preloadTokenImage";
