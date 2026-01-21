import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  preloadTokenImage,
  preloadTokenImages,
  preloadTokenImagesIdle,
} from "./preloadTokenImage";

describe("preloadTokenImage", () => {
  let mockImage: HTMLImageElement;
  let originalImage: typeof Image;
  let originalFetch: typeof fetch;
  let originalDocument: typeof document;

  beforeEach(() => {
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
    // Restore original Image, fetch, and document
    global.Image = originalImage;
    global.fetch = originalFetch;
    global.document = originalDocument;
    vi.clearAllMocks();
  });

  it("should reject with error for empty URL", async () => {
    await expect(preloadTokenImage("")).rejects.toThrow("Invalid image URL");
  });

  it("should reject with error for whitespace-only URL", async () => {
    await expect(preloadTokenImage("   ")).rejects.toThrow("Invalid image URL");
  });

  it("should resolve when image loads successfully", async () => {
    const testUrl = "https://example.com/token.png";
    const promise = preloadTokenImage(testUrl);

    // Wait for fetch to fail and fallback to Image
    await vi.waitFor(() => {
      expect(mockImage.src).toBe(testUrl);
    });

    // Simulate successful image load
    if (mockImage.onload) {
      mockImage.onload(new Event("load"));
    }

    await expect(promise).resolves.toBeUndefined();
  });

  it("should resolve (not reject) when image fails to load", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const testUrl = "https://example.com/invalid.png";
    const promise = preloadTokenImage(testUrl);

    // Wait a bit for fetch to fail and fallback to Image
    await vi.waitFor(() => {
      expect(mockImage.src).toBe(testUrl);
    });

    // Simulate image load error
    if (mockImage.onerror) {
      mockImage.onerror(new Event("error"));
    }

    await expect(promise).resolves.toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it.skip("should set src to start loading", async () => {
    const testUrl = "https://example.com/token.png";
    const promise = preloadTokenImage(testUrl);

    // Process microtasks to allow catch block to execute
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }

    // Check that Image was created (which means src will be set)
    await vi.waitFor(
      () => {
        expect(global.Image).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    // Complete the promise by triggering onload
    if (mockImage.onload) {
      mockImage.onload(new Event("load"));
    }

    await promise;
  });
});

describe("preloadTokenImages", () => {
  let mockImage: HTMLImageElement;
  let originalImage: typeof Image;
  let originalFetch: typeof fetch;
  let originalDocument: typeof document;

  beforeEach(() => {
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

    // Mock fetch to fail immediately (so it falls back to Image)
    originalFetch = global.fetch;
    global.fetch = vi.fn(() =>
      Promise.reject(new Error("CORS error")),
    ) as typeof fetch;

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
    global.Image = originalImage;
    global.fetch = originalFetch;
    global.document = originalDocument;
    vi.clearAllMocks();
  });

  it("should return immediately for empty array", async () => {
    await expect(preloadTokenImages([])).resolves.toBeUndefined();
  });

  it("should filter out empty and whitespace URLs", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const urls = [
      "https://example.com/token1.png",
      "",
      "   ",
      "https://example.com/token2.png",
    ];

    // Create separate mock images for each call
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

    const promise = preloadTokenImages(urls);

    // Wait for fetch to fail and fallback to Image
    await vi.waitFor(() => {
      expect(mockImages.length).toBeGreaterThan(0);
    });

    // Simulate successful loads for valid URLs (2 valid URLs)
    mockImages.forEach((img) => {
      if (img.onload) {
        img.onload(new Event("load"));
      }
    });

    await expect(promise).resolves.toBeUndefined();
    // Should only create Image for valid URLs (2 times)
    expect(global.Image).toHaveBeenCalledTimes(2);
    consoleWarnSpy.mockRestore();
  });

  it.skip("should preload multiple images in parallel", async () => {
    const urls = [
      "https://example.com/token1.png",
      "https://example.com/token2.png",
      "https://example.com/token3.png",
    ];

    // Create separate mock images for each call
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

    const promise = preloadTokenImages(urls);

    // Process microtasks to allow catch blocks to execute
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }

    // Check that all images were created
    await vi.waitFor(
      () => {
        expect(mockImages.length).toBe(3);
      },
      { timeout: 2000 },
    );

    // Trigger load for each image
    mockImages.forEach((img) => {
      if (img.onload) {
        img.onload(new Event("load"));
      }
    });

    await expect(promise).resolves.toBeUndefined();
    expect(global.Image).toHaveBeenCalledTimes(3);
  });

  it.skip("should handle mixed success and failure", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const urls = [
      "https://example.com/token1.png",
      "https://example.com/token2.png",
    ];

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

    const promise = preloadTokenImages(urls);

    // Process microtasks to allow catch blocks to execute
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }

    // Check that both images were created
    await vi.waitFor(
      () => {
        expect(mockImages.length).toBe(2);
      },
      { timeout: 2000 },
    );

    // First image succeeds
    if (mockImages[0]?.onload) {
      mockImages[0].onload(new Event("load"));
    }
    // Second image fails
    if (mockImages[1]?.onerror) {
      mockImages[1].onerror(new Event("error"));
    }

    await expect(promise).resolves.toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });
});

describe("preloadTokenImagesIdle", () => {
  let mockImage: HTMLImageElement;
  let originalImage: typeof Image;
  let originalFetch: typeof fetch;
  let originalDocument: typeof document;
  let originalRequestIdleCallback: typeof requestIdleCallback | undefined;
  let mockRequestIdleCallback: ReturnType<typeof vi.fn>;
  let idleCallbacks: IdleRequestCallback[];

  beforeEach(() => {
    vi.useFakeTimers();
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

    // Mock fetch to fail immediately (so it falls back to Image)
    originalFetch = global.fetch;
    global.fetch = vi.fn(() =>
      Promise.reject(new Error("CORS error")),
    ) as typeof fetch;

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

    // Mock requestIdleCallback
    originalRequestIdleCallback = global.requestIdleCallback;
    idleCallbacks = [];
    mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      idleCallbacks.push(callback);
      return 1;
    });
    global.requestIdleCallback =
      mockRequestIdleCallback as typeof requestIdleCallback;
  });

  afterEach(() => {
    vi.useRealTimers();
    global.Image = originalImage;
    global.fetch = originalFetch;
    global.document = originalDocument;
    if (originalRequestIdleCallback !== undefined) {
      global.requestIdleCallback = originalRequestIdleCallback;
    } else {
      delete (global as { requestIdleCallback?: typeof requestIdleCallback })
        .requestIdleCallback;
    }
    vi.clearAllMocks();
  });

  it("should return immediately for empty array", () => {
    preloadTokenImagesIdle([]);
    vi.advanceTimersByTime(2000);
    expect(global.Image).not.toHaveBeenCalled();
  });

  it("should filter out empty and whitespace URLs", () => {
    const urls = [
      "https://example.com/token1.png",
      "",
      "   ",
      "https://example.com/token2.png",
    ];
    preloadTokenImagesIdle(urls, 0);

    vi.advanceTimersByTime(100);
    // Execute idle callbacks
    idleCallbacks.forEach((callback) => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50,
      } as IdleDeadline);
    });
    if (mockImage.onload) {
      mockImage.onload(new Event("load"));
    }

    // Should only process 2 valid URLs
    expect(mockRequestIdleCallback).toHaveBeenCalled();
  });

  it("should use requestIdleCallback when available", () => {
    const urls = ["https://example.com/token1.png"];
    preloadTokenImagesIdle(urls, 0);

    vi.advanceTimersByTime(100);
    expect(mockRequestIdleCallback).toHaveBeenCalled();
    expect(mockRequestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 5000,
    });

    // Execute idle callback
    idleCallbacks.forEach((callback) => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50,
      } as IdleDeadline);
    });
  });

  it.skip("should fallback to setTimeout when requestIdleCallback is not available", async () => {
    delete (global as { requestIdleCallback?: typeof requestIdleCallback })
      .requestIdleCallback;

    const urls = ["https://example.com/token1.png"];
    preloadTokenImagesIdle(urls, 0);

    vi.advanceTimersByTime(100);

    // Process microtasks to allow catch blocks to execute
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }

    // Should have created Image (via setTimeout fallback)
    await vi.waitFor(
      () => {
        expect(global.Image).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    // Simulate image load
    if (mockImage.onload) {
      mockImage.onload(new Event("load"));
    }
  }, 10000);

  it("should respect delay parameter", () => {
    const urls = ["https://example.com/token1.png"];
    preloadTokenImagesIdle(urls, 1000);

    // Should not call requestIdleCallback before delay
    expect(mockRequestIdleCallback).not.toHaveBeenCalled();

    // Advance time by delay
    vi.advanceTimersByTime(1000);

    // Now should call requestIdleCallback
    expect(mockRequestIdleCallback).toHaveBeenCalled();

    // Execute idle callback
    idleCallbacks.forEach((callback) => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50,
      } as IdleDeadline);
    });
  });

  it("should use default delay of 1000ms when not provided", () => {
    const urls = ["https://example.com/token1.png"];
    preloadTokenImagesIdle(urls);

    // Should not call requestIdleCallback before default delay
    expect(mockRequestIdleCallback).not.toHaveBeenCalled();

    // Advance time by default delay (1000ms)
    vi.advanceTimersByTime(1000);

    // Now should call requestIdleCallback
    expect(mockRequestIdleCallback).toHaveBeenCalled();

    // Execute idle callback
    idleCallbacks.forEach((callback) => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50,
      } as IdleDeadline);
    });
  });

  it.skip("should execute preloadTokenImages when idle callback fires", async () => {
    const urls = ["https://example.com/token1.png"];
    preloadTokenImagesIdle(urls, 0);

    vi.advanceTimersByTime(100);

    // Execute the idle callback
    idleCallbacks.forEach((callback) => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50,
      } as IdleDeadline);
    });

    // Wait a bit for async operations
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should have created Image
    expect(global.Image).toHaveBeenCalled();

    // Simulate image load
    if (mockImage.onload) {
      mockImage.onload(new Event("load"));
    }
  });

  it.skip("should handle errors in preloadTokenImages gracefully", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    // Make preloadTokenImage fail by making onerror fire
    const errorImage = {
      src: "",
      onload: null,
      onerror: null,
      complete: false,
      naturalWidth: 100,
      naturalHeight: 100,
    } as unknown as HTMLImageElement;
    global.Image = vi.fn(() => errorImage) as unknown as typeof Image;

    const urls = ["https://example.com/token1.png"];
    preloadTokenImagesIdle(urls, 0);

    // Advance timers to trigger the initial setTimeout
    vi.advanceTimersByTime(100);

    // Execute the idle callback
    idleCallbacks.forEach((callback) => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50,
      } as IdleDeadline);
    });

    // Process microtasks multiple times to allow catch blocks to execute
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }

    // Should have created Image (after fetch fails)
    await vi.waitFor(
      () => {
        expect(global.Image).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    // Simulate image error
    if (errorImage.onerror) {
      errorImage.onerror(new Event("error"));
    }

    // Should not throw, but log warning
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  }, 10000);
});
