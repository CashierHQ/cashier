/**
 * ImageCache module for managing token image caching
 * Handles loading, caching, and retrieving token images
 */

import { SvelteMap } from "svelte/reactivity";

// Reactive cache for token images using SvelteMap for reactivity
// Key: token address, Value: cached image data URL or original URL
// SvelteMap makes the cache reactive so components can react to cache updates
const tokenImageCache = new SvelteMap<string, string>();

// Track which addresses are currently being loaded to prevent duplicate requests
const loadingAddresses = new Set<string>();

/**
 * IC Explorer image CDN does not send Access-Control-Allow-Origin.
 * Browser fetch() and canvas export after <img> load therefore always fail from our origin.
 * Using the HTTPS URL as cache value is correct: <img src> loads without CORS.
 */
function isIcExplorerTokenImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname === "api.icexplorer.io" && u.pathname.startsWith("/images/")
    );
  } catch {
    return false;
  }
}

/**
 * Get cached token image if available
 * This function is reactive - SvelteMap provides reactivity automatically
 * @param address Token address (canister ID)
 * @returns Cached image URL (data URL or original URL) or null if not cached
 */
export function getCachedTokenImage(address: string): string | null {
  // SvelteMap.get() is reactive - components using this will update when cache changes
  return tokenImageCache.get(address) || null;
}

/**
 * Check if an image is currently being loaded
 * @param address Token address
 * @returns true if image is being loaded
 */
export function isImageLoading(address: string): boolean {
  return loadingAddresses.has(address);
}

/**
 * Load image for a token address and store it in cache
 * Uses fetch to get blob (works with octet-stream and other content types)
 * Converts blob to data URL via FileReader for reliable caching
 * Falls back to Image object if fetch fails
 * @param address Token address
 * @param imageUrl Original image URL
 * @returns Promise that resolves when image is loaded and cached
 */
export async function loadTokenImage(
  address: string,
  imageUrl: string,
): Promise<void> {
  // Skip if already cached
  if (tokenImageCache.has(address)) {
    return;
  }

  // Skip if already loading
  if (loadingAddresses.has(address)) {
    return;
  }

  // Mark as loading
  loadingAddresses.add(address);

  try {
    if (isIcExplorerTokenImageUrl(imageUrl)) {
      tokenImageCache.set(address, imageUrl);
      const preload = new Image();
      preload.src = imageUrl;
      return;
    }

    // First, try to fetch as blob (works with octet-stream and all content types)
    try {
      const response = await fetch(imageUrl, {
        cache: "force-cache", // Use browser cache if available
        mode: "cors", // Allow CORS
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Convert blob to data URL using FileReader
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result && typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to convert blob to data URL"));
          }
        };
        reader.onerror = () => {
          reject(new Error("FileReader error"));
        };
        reader.readAsDataURL(blob);
      });

      // Store data URL in cache - this prevents any future network requests
      tokenImageCache.set(address, dataUrl);
      return;
    } catch {
      // If fetch fails (e.g., CORS or network error), fall back to Image object
      // Fallback: Use Image object to load image
      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          // Try to convert to data URL using canvas
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL("image/png");
              // Store data URL in cache
              tokenImageCache.set(address, dataUrl);
              resolve();
              return;
            }
          } catch {
            // Cross-origin image without CORS: canvas is tainted; keep original URL
          }

          // If canvas conversion failed, store original URL
          // Browser should use cache for subsequent requests
          tokenImageCache.set(address, imageUrl);
          resolve();
        };

        img.onerror = () => {
          reject(new Error(`Failed to load image for token ${address}`));
        };

        img.src = imageUrl;

        // If image is already complete (cached), handle immediately
        if (img.complete) {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL("image/png");
              tokenImageCache.set(address, dataUrl);
              resolve();
              return;
            }
          } catch {
            // Canvas failed, use original URL
          }
          tokenImageCache.set(address, imageUrl);
          resolve();
        }
      });
    }
  } catch {
    // Don't throw - continue loading other images
  } finally {
    // Remove from loading set
    loadingAddresses.delete(address);
  }
}

/**
 * Load multiple token images in parallel
 * @param addresses Array of token addresses to load
 * @param getImageUrl Function to get image URL for a given address
 * @returns Promise that resolves when all images are loaded (or failed)
 */
export async function loadTokenImages(
  addresses: string[],
  getImageUrl: (address: string) => string,
): Promise<void> {
  const loadPromises = addresses.map((address) => {
    const imageUrl = getImageUrl(address);
    return loadTokenImage(address, imageUrl);
  });

  await Promise.allSettled(loadPromises);
}

/**
 * Clear cache for a specific address
 * @param address Token address
 */
export function clearCache(address: string): void {
  tokenImageCache.delete(address);
}

/**
 * Clear all cached images
 */
export function clearAllCache(): void {
  tokenImageCache.clear();
  loadingAddresses.clear();
}

/**
 * Get cache size
 * @returns Number of cached images
 */
export function getCacheSize(): number {
  return tokenImageCache.size;
}
