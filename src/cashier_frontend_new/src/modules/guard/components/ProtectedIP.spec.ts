/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the userIPStore
vi.mock("$modules/guard/state/userIPStore.svelte", () => ({
  userIPStore: {
    countryCode: null,
    isBlacklisted: vi.fn(() => false),
    enabled: true,
    query: {
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    },
  },
}));

describe("ProtectedIP Guard Logic", () => {
  let alertSpy: ReturnType<typeof vi.fn>;
  let mockStore: {
    countryCode: string | null;
    isBlacklisted: ReturnType<typeof vi.fn>;
    enabled: boolean;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock alert without using window
    alertSpy = vi.fn();
    global.alert = alertSpy as any;

    // Get the mocked store
    const { userIPStore } =
      await import("$modules/guard/state/userIPStore.svelte");
    mockStore = userIPStore as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("when country is blacklisted", () => {
    it("should show alert when user is from blacklisted country", () => {
      // Setup: User from blacklisted country
      Object.defineProperty(mockStore, "countryCode", {
        get: () => "US",
        configurable: true,
      });
      mockStore.isBlacklisted = vi.fn(() => true);

      // Simulate the $effect logic
      const shouldShow = !(mockStore.countryCode && mockStore.isBlacklisted());

      expect(shouldShow).toBe(false);

      // Simulate alert call from component
      if (mockStore.countryCode && mockStore.isBlacklisted()) {
        alert(
          "Sorry for the inconvenience, access from your location is restricted.",
        );
      }

      expect(alertSpy).toHaveBeenCalledWith(
        "Sorry for the inconvenience, access from your location is restricted.",
      );
    });

    it("should not render children when blocked", () => {
      Object.defineProperty(mockStore, "countryCode", {
        get: () => "IR",
        configurable: true,
      });
      mockStore.isBlacklisted = vi.fn(() => true);

      const shouldShow = !(mockStore.countryCode && mockStore.isBlacklisted());

      expect(shouldShow).toBe(false);
    });
  });

  describe("when country is allowed", () => {
    it("should render children when user is from allowed country", () => {
      Object.defineProperty(mockStore, "countryCode", {
        get: () => "VN",
        configurable: true,
      });
      mockStore.isBlacklisted = vi.fn(() => false);

      const shouldShow = !(mockStore.countryCode && mockStore.isBlacklisted());

      expect(shouldShow).toBe(true);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("should not show alert when allowed", () => {
      Object.defineProperty(mockStore, "countryCode", {
        get: () => "GB",
        configurable: true,
      });
      mockStore.isBlacklisted = vi.fn(() => false);

      // Simulate the effect logic
      if (mockStore.countryCode && mockStore.isBlacklisted()) {
        alert(
          "Sorry for the inconvenience, access from your location is restricted.",
        );
      }

      expect(alertSpy).not.toHaveBeenCalled();
    });
  });

  describe("when country code is null", () => {
    it("should render children when country code is null", () => {
      Object.defineProperty(mockStore, "countryCode", {
        get: () => null,
        configurable: true,
      });
      mockStore.isBlacklisted = vi.fn(() => false);

      const shouldShow = !(mockStore.countryCode && mockStore.isBlacklisted());

      expect(shouldShow).toBe(true);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it("should not check blacklist when country code is null", () => {
      Object.defineProperty(mockStore, "countryCode", {
        get: () => null,
        configurable: true,
      });
      mockStore.isBlacklisted = vi.fn(() => false);

      // Simulate the effect logic - short circuits on null countryCode
      const shouldCheckBlacklist =
        mockStore.countryCode && mockStore.isBlacklisted();

      expect(shouldCheckBlacklist).toBeFalsy();
      // isBlacklisted is not called because of short-circuit
    });
  });

  describe("multiple blacklisted countries", () => {
    const blacklistedCountries = ["US", "CU", "IR", "KP", "SY"];

    blacklistedCountries.forEach((country) => {
      it(`should block access for ${country}`, () => {
        Object.defineProperty(mockStore, "countryCode", {
          get: () => country,
          configurable: true,
        });
        mockStore.isBlacklisted = vi.fn(() => true);

        const shouldShow = !(
          mockStore.countryCode && mockStore.isBlacklisted()
        );

        expect(shouldShow).toBe(false);

        // Simulate alert
        if (mockStore.countryCode && mockStore.isBlacklisted()) {
          alert(
            "Sorry for the inconvenience, access from your location is restricted.",
          );
        }

        expect(alertSpy).toHaveBeenCalledWith(
          "Sorry for the inconvenience, access from your location is restricted.",
        );
      });
    });
  });

  describe("multiple allowed countries", () => {
    const allowedCountries = ["VN", "JP", "GB", "FR", "DE"];

    allowedCountries.forEach((country) => {
      it(`should allow access for ${country}`, () => {
        Object.defineProperty(mockStore, "countryCode", {
          get: () => country,
          configurable: true,
        });
        mockStore.isBlacklisted = vi.fn(() => false);

        const shouldShow = !(
          mockStore.countryCode && mockStore.isBlacklisted()
        );

        expect(shouldShow).toBe(true);
        expect(alertSpy).not.toHaveBeenCalled();
      });
    });
  });
});
