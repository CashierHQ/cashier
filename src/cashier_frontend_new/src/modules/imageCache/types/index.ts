/**
 * Types for image cache module
 */

export type ImageCacheEntry = {
  dataUrl: string;
  url: string;
  loadedAt: number;
};

export type ImageLoadOptions = {
  skipStore?: boolean;
  forceReload?: boolean;
};
