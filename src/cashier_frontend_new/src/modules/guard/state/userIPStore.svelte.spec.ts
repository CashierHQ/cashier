import * as ipResolver from "$modules/guard/services/ip_resolver";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserIPStore } from "./userIPStore.svelte";

// Mock the dependencies
vi.mock("$modules/guard/services/ip_resolver");
vi.mock("$modules/guard/data/blacklist.json", () => ({
  default: {
    country_codes: ["US", "CU", "IR", "KP", "SY"],
  },
}));
vi.mock("$modules/guard/constants", () => ({
  PROTECTED_IP_BLOCKING_ENABLE: true,
}));

vi.mock("$lib/managedState", () => ({
  managedState: vi.fn((config) => {
    // Simple mock that immediately calls queryFn
    const mockState = {
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };

    // Call queryFn immediately to populate data
    config.queryFn().then((result: any) => {
      mockState.data = result;
    });

    return mockState;
  }),
}));

describe("UserIPStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should use default enabled flag from constants", () => {
      const store = new UserIPStore();
      expect(store.enabled).toBe(true);
    });

    it("should accept custom enabled flag", () => {
      const store = new UserIPStore(false);
      expect(store.enabled).toBe(false);
    });

    it("should not query location when disabled", async () => {
      const querySpy = vi.spyOn(ipResolver, "queryUserCountryLocation");

      const store = new UserIPStore(false);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // queryFn is called but returns early
      expect(store.countryCode).toBeNull();
    });
  });

  describe("countryCode", () => {
    it("should return null when location query fails", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockRejectedValue(
        new Error("Network error"),
      );

      const store = new UserIPStore(true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(store.countryCode).toBeNull();
    });

    it("should return country code when location query succeeds", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue("VN");

      const store = new UserIPStore(true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(store.countryCode).toBe("VN");
    });

    it("should return null when store is disabled", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue("VN");

      const store = new UserIPStore(false);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(store.countryCode).toBeNull();
    });

    it("should normalize lowercase country codes to uppercase", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue(
        "vn" as any,
      );

      const store = new UserIPStore(true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(store.countryCode).toBe("vn");
    });
  });

  describe("isBlacklisted", () => {
    it("should return false when store is disabled", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue("US");

      const store = new UserIPStore(false);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(store.isBlacklisted()).toBe(false);
    });

    it("should return false when countryCode is null", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockRejectedValue(
        new Error("Failed"),
      );

      const store = new UserIPStore(true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(store.isBlacklisted()).toBe(false);
    });

    it("should return true for blacklisted countries (uppercase)", async () => {
      const blacklistedCountries = ["US", "CU", "IR", "KP", "SY"];

      for (const country of blacklistedCountries) {
        vi.clearAllMocks();

        vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue(
          country,
        );

        const store = new UserIPStore(true);
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(store.isBlacklisted()).toBe(true);
      }
    });

    it("should return true for blacklisted countries (lowercase)", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue(
        "us" as any,
      );

      const store = new UserIPStore(true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(store.isBlacklisted()).toBe(true);
    });

    it("should return false for non-blacklisted countries", async () => {
      const allowedCountries = ["VN", "JP", "GB", "FR", "DE"];

      for (const country of allowedCountries) {
        vi.clearAllMocks();

        vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue(
          country,
        );

        const store = new UserIPStore(true);
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(store.isBlacklisted()).toBe(false);
      }
    });

    it("should handle mixed case country codes in blacklist check", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue(
        "Us" as any,
      );

      const store = new UserIPStore(true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(store.isBlacklisted()).toBe(true);
    });
  });

  describe("query", () => {
    it("should expose the managed state query object", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue("VN");

      const store = new UserIPStore(true);

      expect(store.query).toBeDefined();
      expect(store.query).toHaveProperty("data");
    });
  });

  describe("error handling", () => {
    it("should log error when queryUserCountryLocation fails", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      vi.spyOn(ipResolver, "queryUserCountryLocation").mockRejectedValue(
        new Error("API timeout"),
      );

      const store = new UserIPStore(true);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching user IP location:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("should not log error when disabled", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      vi.spyOn(ipResolver, "queryUserCountryLocation").mockRejectedValue(
        new Error("API timeout"),
      );

      const store = new UserIPStore(false);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("enabled getter", () => {
    it("should return the enabled status", () => {
      const enabledStore = new UserIPStore(true);
      const disabledStore = new UserIPStore(false);

      expect(enabledStore.enabled).toBe(true);
      expect(disabledStore.enabled).toBe(false);
    });
  });
});
