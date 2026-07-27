import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getCachedTokenImage,
  loadTokenImage,
  loadTokenImages,
  clearCache,
  clearAllCache,
  getCacheSize,
  isImageLoading,
  isTokenImageFailed,
  markTokenImageFailed,
} from "$modules/imageCache/utils/imageCache";

describe("imageCache", () => {
  let mockImage: HTMLImageElement;
  let originalImage: typeof Image;
  let originalFetch: typeof fetch;
  let originalDocument: typeof document;
  let originalLocalStorage: Storage | undefined;
  let mockFileReader: FileReader;
  let localStorageData: Record<string, string>;

  beforeEach(() => {
    localStorageData = {};
    originalLocalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => localStorageData[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageData[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageData[key];
        }),
      },
    });

    // Mock document.createElement for canvas (needed for server environment)
    originalDocument = global.document;
    global.document = {
      createElement: vi.fn((tag: string) => {
        if (tag === "canvas") {
          return {
            width: 0,
            height: 0,
            getContext: vi.fn(() => ({
              drawImage: vi.fn(),
            })),
            toDataURL: vi.fn(() => "data:image/png;base64,test"),
          } as unknown as HTMLCanvasElement;
        }
        return {} as HTMLElement;
      }),
    } as unknown as typeof document;

    // Mock FileReader
    mockFileReader = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      readAsDataURL: vi.fn(function (this: FileReader, blob: Blob) {
        // Simulate successful read
        setTimeout(() => {
          if (this.onloadend) {
            this.onloadend({
              target: { result: "data:image/png;base64,test" },
            } as ProgressEvent<FileReader>);
          }
        }, 0);
      }),
      onloadend: null,
      onerror: null,
    } as unknown as FileReader;

    global.FileReader = vi.fn(
      () => mockFileReader,
    ) as unknown as typeof FileReader;

    // Mock fetch to fail immediately (so it falls back to Image)
    originalFetch = global.fetch;
    global.fetch = vi.fn(() =>
      Promise.reject(new Error("CORS error")),
    ) as typeof fetch;

    // Mock Image constructor
    originalImage = global.Image;
    mockImage = {
      src: "",
      onload: null,
      onerror: null,
      complete: false,
      naturalWidth: 100,
      naturalHeight: 100,
    } as unknown as HTMLImageElement;

    global.Image = vi.fn(() => mockImage) as unknown as typeof Image;
  });

  afterEach(() => {
    global.document = originalDocument;
    global.fetch = originalFetch;
    global.Image = originalImage;
    clearAllCache();
    if (originalLocalStorage) {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: originalLocalStorage,
      });
    } else {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    }
    vi.clearAllMocks();
  });

  describe("getCachedTokenImage", () => {
    it("should return null for uncached address", () => {
      expect(getCachedTokenImage("test-address")).toBeNull();
    });
  });

  describe("loadTokenImage", () => {
    it("should cache fetched IC Explorer images as data URLs", async () => {
      const address = "ss2fx-dyaaa-aaaar-qacoq-cai";
      const imageUrl = `https://api.icexplorer.io/images/${address}`;
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve({} as Blob),
        } as Response),
      ) as typeof fetch;
      global.FileReader = vi.fn(
        () =>
          ({
            readAsDataURL: vi.fn(function (this: FileReader) {
              Object.defineProperty(this, "result", {
                configurable: true,
                value: "data:image/png;base64,test",
              });
              this.onloadend?.({
                target: { result: "data:image/png;base64,test" },
              } as ProgressEvent<FileReader>);
            }),
            onloadend: null,
            onerror: null,
          }) as unknown as FileReader,
      ) as unknown as typeof FileReader;

      await loadTokenImage(address, imageUrl);

      expect(getCachedTokenImage(address)).toBe("data:image/png;base64,test");
      expect(global.fetch).toHaveBeenCalledWith(imageUrl, {
        cache: "force-cache",
        mode: "cors",
      });
    });

    it("should persist cached image entries across reloads", async () => {
      const address = "ss2fx-dyaaa-aaaar-qacoq-cai";
      const imageUrl = `https://api.icexplorer.io/images/${address}`;
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve({} as Blob),
        } as Response),
      ) as typeof fetch;
      global.FileReader = vi.fn(
        () =>
          ({
            readAsDataURL: vi.fn(function (this: FileReader) {
              Object.defineProperty(this, "result", {
                configurable: true,
                value: "data:image/png;base64,test",
              });
              this.onloadend?.({
                target: { result: "data:image/png;base64,test" },
              } as ProgressEvent<FileReader>);
            }),
            onloadend: null,
            onerror: null,
          }) as unknown as FileReader,
      ) as unknown as typeof FileReader;

      await loadTokenImage(address, imageUrl);

      const persistedEntries = JSON.parse(
        localStorageData.cashier_token_image_cache,
      ) as [string, string][];
      expect(persistedEntries).toContainEqual([
        address,
        "data:image/png;base64,test",
      ]);
    });

    it("should load image and cache it", async () => {
      const address = "test-address";
      const imageUrl = "https://example.com/image.png";

      // Start loading
      const loadPromise = loadTokenImage(address, imageUrl);

      // Wait a bit for async operations
      await Promise.resolve();
      await Promise.resolve();

      // Simulate image load
      if (mockImage.onload) {
        mockImage.onload(new Event("load"));
      }

      await loadPromise;

      // Check that image was cached
      const cached = getCachedTokenImage(address);
      expect(cached).toBeTruthy();
    });

    it("should skip if already cached", async () => {
      const address = "test-address";
      const imageUrl = "https://example.com/image.png";

      // Load first time
      const firstLoadPromise = loadTokenImage(address, imageUrl);

      // Wait for fetch to fail and fallback to Image
      await Promise.resolve();
      await Promise.resolve();

      // Simulate image load
      if (mockImage.onload) {
        mockImage.onload(new Event("load"));
      }

      await firstLoadPromise;
      await Promise.resolve();

      // Try to load again - should skip
      const secondLoadPromise = loadTokenImage(address, imageUrl);
      await Promise.resolve();

      // Should resolve immediately without creating new Image
      await secondLoadPromise;
      expect(global.Image).toHaveBeenCalledTimes(1);
    });

    it("should remember failed token image sources for the current session", async () => {
      const address = "test-address";
      const imageUrl = "https://example.com/missing.png";

      const loadPromise = loadTokenImage(address, imageUrl);

      await Promise.resolve();
      await Promise.resolve();

      if (mockImage.onerror) {
        mockImage.onerror(new Event("error"));
      }

      await loadPromise;

      expect(isTokenImageFailed(address, imageUrl)).toBe(true);

      await loadTokenImage(address, imageUrl);
      expect(global.Image).toHaveBeenCalledTimes(1);
    });
  });

  describe("loadTokenImages", () => {
    it("should load multiple images in parallel", async () => {
      const addresses = ["address1", "address2"];
      const getImageUrl = (addr: string) => `https://example.com/${addr}.png`;

      // Create separate mock images for each address
      const mockImages: HTMLImageElement[] = [];
      global.Image = vi.fn(() => {
        const img = {
          src: "",
          onload: null,
          onerror: null,
          complete: false,
          naturalWidth: 100,
          naturalHeight: 100,
        } as unknown as HTMLImageElement;
        mockImages.push(img);
        return img;
      }) as unknown as typeof Image;

      const loadPromise = loadTokenImages(addresses, getImageUrl);

      await Promise.resolve();
      await Promise.resolve();

      // Simulate both images loading - need to call onload for each image
      mockImages.forEach((img) => {
        if (img.onload) {
          img.onload(new Event("load"));
        }
      });

      await loadPromise;

      // Both should be cached
      expect(getCachedTokenImage("address1")).toBeTruthy();
      expect(getCachedTokenImage("address2")).toBeTruthy();
    });
  });

  describe("clearCache", () => {
    it("should clear cache for specific address", async () => {
      const address = "test-address";
      const imageUrl = "https://example.com/image.png";

      const loadPromise = loadTokenImage(address, imageUrl);

      await Promise.resolve();
      await Promise.resolve();

      // Simulate image load
      if (mockImage.onload) {
        mockImage.onload(new Event("load"));
      }

      await loadPromise;
      await Promise.resolve();

      expect(getCachedTokenImage(address)).toBeTruthy();

      clearCache(address);
      expect(getCachedTokenImage(address)).toBeNull();
      const persistedEntries = JSON.parse(
        localStorageData.cashier_token_image_cache,
      ) as [string, string][];
      expect(persistedEntries).not.toContainEqual([
        address,
        "data:image/png;base64,test",
      ]);
    });

    it("should clear failed image state for a specific address", () => {
      const address = "test-address";
      const imageUrl = "https://example.com/missing.png";

      markTokenImageFailed(address, imageUrl);
      expect(isTokenImageFailed(address, imageUrl)).toBe(true);

      clearCache(address);
      expect(isTokenImageFailed(address, imageUrl)).toBe(false);
    });
  });

  describe("clearAllCache", () => {
    it("should clear all cached images", async () => {
      const address1 = "address1";
      const address2 = "address2";

      // Create separate mock images for each address
      const mockImages: HTMLImageElement[] = [];
      global.Image = vi.fn(() => {
        const img = {
          src: "",
          onload: null,
          onerror: null,
          complete: false,
          naturalWidth: 100,
          naturalHeight: 100,
        } as unknown as HTMLImageElement;
        mockImages.push(img);
        return img;
      }) as unknown as typeof Image;

      const loadPromise1 = loadTokenImage(
        address1,
        "https://example.com/1.png",
      );
      const loadPromise2 = loadTokenImage(
        address2,
        "https://example.com/2.png",
      );

      await Promise.resolve();
      await Promise.resolve();

      // Simulate both images loading
      mockImages.forEach((img) => {
        if (img.onload) {
          img.onload(new Event("load"));
        }
      });

      await Promise.all([loadPromise1, loadPromise2]);
      await Promise.resolve();

      clearAllCache();

      expect(getCachedTokenImage(address1)).toBeNull();
      expect(getCachedTokenImage(address2)).toBeNull();
      expect(getCacheSize()).toBe(0);
      expect(localStorageData.cashier_token_image_cache).toBe("[]");
    });
  });

  describe("getCacheSize", () => {
    it("should return correct cache size", async () => {
      expect(getCacheSize()).toBe(0);

      const loadPromise = loadTokenImage(
        "address1",
        "https://example.com/1.png",
      );

      await Promise.resolve();
      await Promise.resolve();

      // Simulate image load
      if (mockImage.onload) {
        mockImage.onload(new Event("load"));
      }

      await loadPromise;
      await Promise.resolve();

      expect(getCacheSize()).toBeGreaterThan(0);
    });
  });

  describe("isImageLoading", () => {
    it("should return false when image is not loading", () => {
      expect(isImageLoading("test-address")).toBe(false);
    });
  });
});
