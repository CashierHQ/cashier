// Global cache to track preloaded images
// Key: image URL, Value: Image object that was preloaded
const preloadedImagesCache = new Map<string, HTMLImageElement>();

// Global cache to store image data URLs for images that are already loaded
// This prevents re-fetching images that are already in browser cache
const imageDataUrlCache = new Map<string, string>();

/**
 * Check if an image URL has been preloaded
 * @param url - The URL of the image to check
 * @returns true if the image has been preloaded and is complete
 */
export function isImagePreloaded(url: string): boolean {
  const cachedImg = preloadedImagesCache.get(url);
  return cachedImg !== undefined && cachedImg.complete;
}

/**
 * Get a preloaded image from cache if available
 * @param url - The URL of the image
 * @returns The preloaded Image object or null if not preloaded
 */
export function getPreloadedImage(url: string): HTMLImageElement | null {
  const cachedImg = preloadedImagesCache.get(url);
  return cachedImg && cachedImg.complete ? cachedImg : null;
}

/**
 * Get cached image data URL if available
 * @param url - The URL of the image
 * @returns The cached data URL or null if not cached
 */
export function getCachedImageDataUrl(url: string): string | null {
  return imageDataUrlCache.get(url) || null;
}

/**
 * Preload a token image by fetching it as blob and converting to data URL.
 * This prevents browser from making new requests for already loaded images.
 * @param url - The URL of the token image to preload
 * @returns Promise that resolves when the image is loaded or rejects on error
 */
export function preloadTokenImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Skip if URL is empty or invalid
    if (!url || url.trim() === "") {
      reject(new Error("Invalid image URL"));
      return;
    }

    // Check if already preloaded
    if (isImagePreloaded(url)) {
      resolve();
      return;
    }

    // Check if we already have a data URL cached
    if (imageDataUrlCache.has(url)) {
      resolve();
      return;
    }

    // Try to use fetch first to get blob and convert to data URL
    // This prevents browser from making new HTTP requests
    fetch(url, {
      cache: "force-cache", // Try to use cache if available
      mode: "cors", // Allow CORS for cross-origin images
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        return response.blob();
      })
      .then((blob) => {
        // Convert blob to data URL
        return new Promise<string>((resolveBlob, rejectBlob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            resolveBlob(dataUrl);
          };
          reader.onerror = () => {
            rejectBlob(new Error("Failed to read blob"));
          };
          reader.readAsDataURL(blob);
        });
      })
      .then((dataUrl) => {
        // Store data URL in cache - this prevents any future HTTP requests
        imageDataUrlCache.set(url, dataUrl);

        // Also create Image object and store it for compatibility
        const img = new Image();
        img.onload = () => {
          preloadedImagesCache.set(url, img);
        };
        img.src = dataUrl; // Use data URL instead of original URL

        resolve();
      })
      .catch((error) => {
        // If fetch fails (e.g., CORS or network error), try Image object approach
        console.warn(
          `[ImageCache] Fetch failed for ${url}, using Image fallback:`,
          error.message,
        );

        const img = new Image();

        img.onload = () => {
          preloadedImagesCache.set(url, img);

          // Try to convert to data URL using canvas
          // This might work even for cross-origin images if they're already loaded
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL("image/png");
              imageDataUrlCache.set(url, dataUrl);
              // Successfully converted to data URL via canvas
            }
          } catch (canvasError) {
            // Canvas conversion failed (likely CORS), but image is still cached
            console.warn(
              `[ImageCache] Canvas conversion failed for ${url}:`,
              canvasError,
            );
            // Browser should use cache for subsequent requests, but might not work
          }

          resolve();
        };

        img.onerror = () => {
          console.warn(`[ImageCache] Failed to preload token image: ${url}`);
          resolve(); // Resolve instead of reject to not break the flow
        };

        img.src = url;

        // If image is already complete (cached), resolve immediately
        if (img.complete) {
          preloadedImagesCache.set(url, img);

          // Try to convert to data URL
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL("image/png");
              imageDataUrlCache.set(url, dataUrl);
              // Successfully converted cached image to data URL
            }
          } catch (canvasError) {
            console.warn(
              `[ImageCache] Canvas conversion failed for cached image ${url}:`,
              canvasError,
            );
          }

          resolve();
        }
      });
  });
}

/**
 * Preload multiple token images in parallel
 * @param urls - Array of image URLs to preload
 * @returns Promise that resolves when all images are loaded (or failed)
 */
export async function preloadTokenImages(urls: string[]): Promise<void> {
  const validUrls = urls.filter((url) => url && url.trim() !== "");
  if (validUrls.length === 0) {
    return;
  }

  // Preload all images in parallel
  await Promise.allSettled(validUrls.map((url) => preloadTokenImage(url)));
}

/**
 * Preload token images when the browser is idle (after other important tasks)
 * Uses requestIdleCallback if available, otherwise falls back to setTimeout
 * @param urls - Array of image URLs to preload
 * @param delay - Optional delay in milliseconds before starting preload
 */
export function preloadTokenImagesIdle(
  urls: string[],
  delay: number = 1000,
): void {
  const validUrls = urls.filter((url) => url && url.trim() !== "");
  if (validUrls.length === 0) {
    return;
  }

  const startPreload = () => {
    // Use requestIdleCallback if available (browser is idle)
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(
        () => {
          preloadTokenImages(validUrls).catch((error) => {
            console.warn("Failed to preload some token images:", error);
          });
        },
        { timeout: 5000 }, // Fallback timeout: start after 5 seconds max
      );
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        preloadTokenImages(validUrls).catch((error) => {
          console.warn("Failed to preload some token images:", error);
        });
      }, delay);
    }
  };

  // Add initial delay to ensure other important data is loaded first
  setTimeout(startPreload, delay);
}
