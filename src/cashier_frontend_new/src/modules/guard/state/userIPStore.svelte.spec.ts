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
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Clear session storage
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("countryCode", () => {
    it("should return null when location query fails", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockRejectedValue(
        new Error("Network error"),
      );

      const store = new UserIPStore();

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.countryCode).toBeNull();
    });

    it("should return country code when location query succeeds", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue("VN");

      const store = new UserIPStore();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.countryCode).toBe("VN");
    });

    it("should normalize lowercase country codes to uppercase", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue(
        "vn" as any,
      );

      const store = new UserIPStore();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.countryCode).toBe("vn");
    });
  });

  describe("isBlacklisted", () => {
    it("should return false when countryCode is null", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockRejectedValue(
        new Error("Failed"),
      );

      const store = new UserIPStore();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.isBlacklisted()).toBe(false);
    });

    it("should return true for blacklisted countries (uppercase)", async () => {
      const blacklistedCountries = ["US", "CU", "IR", "KP", "SY"];

      for (const country of blacklistedCountries) {
        vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue(
          country,
        );

        const store = new UserIPStore();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(store.isBlacklisted()).toBe(true);
      }
    });

    it("should return true for blacklisted countries (lowercase)", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue(
        "us" as any,
      );

      const store = new UserIPStore();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.isBlacklisted()).toBe(true);
    });

    it("should return false for non-blacklisted countries", async () => {
      const allowedCountries = ["VN", "JP", "GB", "FR", "DE"];

      for (const country of allowedCountries) {
        vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue(
          country,
        );

        const store = new UserIPStore();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(store.isBlacklisted()).toBe(false);
      }
    });

    it("should handle mixed case country codes in blacklist check", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue(
        "Us" as any,
      );

      const store = new UserIPStore();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(store.isBlacklisted()).toBe(true);
    });
  });

  describe("query", () => {
    it("should expose the managed state query object", async () => {
      vi.spyOn(ipResolver, "queryUserCountryLocation").mockResolvedValue("VN");

      const store = new UserIPStore();

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

      const store = new UserIPStore();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error fetching user IP location:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
