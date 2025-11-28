import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { calculateDelegationExpirationMs } from "./calculateDelegationExpirationMs";
import type { DelegationChain } from "@dfinity/identity";
import { NANOS_IN_MILLIS } from "../constants";

describe("calculateDelegationExpirationMs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockDelegationChain = (
    expirations: bigint[],
  ): DelegationChain => {
    return {
      delegations: expirations.map((expiration) => ({
        delegation: {
          expiration,
          pubkey: new Uint8Array(),
          targets: undefined,
        },
        signature: new Uint8Array(),
      })),
      publicKey: new Uint8Array(),
    } as unknown as DelegationChain;
  };

  describe("single delegation", () => {
    it("should calculate remaining time correctly for future expiration", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const futureTime = now + 60000; // 60 seconds in the future
      const futureNs = BigInt(futureTime) * NANOS_IN_MILLIS;

      const delegationChain = createMockDelegationChain([futureNs]);

      const result = calculateDelegationExpirationMs(delegationChain);

      expect(result).toEqual(60000);
    });

    it("should return negative value for expired delegation", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const pastTime = now - 60000; // 60 seconds in the past
      const pastNs = BigInt(pastTime) * NANOS_IN_MILLIS;

      const delegationChain = createMockDelegationChain([pastNs]);

      const result = calculateDelegationExpirationMs(delegationChain);

      expect(result).toEqual(-60000);
    });

    it("should return approximately 0 for delegation expiring now", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const nowNs = BigInt(now) * NANOS_IN_MILLIS;

      const delegationChain = createMockDelegationChain([nowNs]);

      const result = calculateDelegationExpirationMs(delegationChain);

      expect(result).toEqual(0);
    });

    it("should handle very large future expiration", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const farFuture = now + 86400000 * 365; // 1 year in the future
      const farFutureNs = BigInt(farFuture) * NANOS_IN_MILLIS;

      const delegationChain = createMockDelegationChain([farFutureNs]);

      const result = calculateDelegationExpirationMs(delegationChain);

      expect(result).toEqual(86400000 * 365);
    });
  });

  describe("multiple delegations", () => {
    it("should return time until earliest expiration from multiple delegations", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const time1 = BigInt(now + 120000) * NANOS_IN_MILLIS; // 2 minutes
      const time2 = BigInt(now + 60000) * NANOS_IN_MILLIS; // 1 minute (earliest)
      const time3 = BigInt(now + 180000) * NANOS_IN_MILLIS; // 3 minutes

      const delegationChain = createMockDelegationChain([time1, time2, time3]);

      const result = calculateDelegationExpirationMs(delegationChain);

      expect(result).toEqual(60000);
    });

    it("should handle mix of expired and valid delegations", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const pastTime = BigInt(now - 30000) * NANOS_IN_MILLIS; // 30s ago (earliest, expired)
      const futureTime1 = BigInt(now + 60000) * NANOS_IN_MILLIS; // 1 minute
      const futureTime2 = BigInt(now + 120000) * NANOS_IN_MILLIS; // 2 minutes

      const delegationChain = createMockDelegationChain([
        futureTime1,
        pastTime,
        futureTime2,
      ]);

      const result = calculateDelegationExpirationMs(delegationChain);

      // Should return negative value (expired)
      expect(result).toEqual(-30000);
    });

    it("should handle all expired delegations", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const past1 = BigInt(now - 120000) * NANOS_IN_MILLIS; // 2 minutes ago
      const past2 = BigInt(now - 60000) * NANOS_IN_MILLIS; // 1 minute ago
      const past3 = BigInt(now - 180000) * NANOS_IN_MILLIS; // 3 minutes ago (earliest)

      const delegationChain = createMockDelegationChain([past1, past2, past3]);

      const result = calculateDelegationExpirationMs(delegationChain);

      // Should return negative value for earliest (most expired)
      expect(result).toEqual(-180000);
    });

    it("should handle delegations with same expiration", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const sameTime = BigInt(now + 90000) * NANOS_IN_MILLIS; // 90 seconds

      const delegationChain = createMockDelegationChain([
        sameTime,
        sameTime,
        sameTime,
      ]);

      const result = calculateDelegationExpirationMs(delegationChain);

      expect(result).toEqual(90000);
    });

    it("should find earliest among many delegations", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const times = [
        BigInt(now + 500000),
        BigInt(now + 400000),
        BigInt(now + 300000),
        BigInt(now + 200000),
        BigInt(now + 100000),
        BigInt(now + 50000), // Earliest
        BigInt(now + 150000),
        BigInt(now + 250000),
      ].map((t) => t * NANOS_IN_MILLIS);

      const delegationChain = createMockDelegationChain(times);

      const result = calculateDelegationExpirationMs(delegationChain);

      expect(result).toEqual(50000);
    });
  });

  describe("edge cases", () => {
    it("should return 0 or negative for empty delegation chain", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const delegationChain = createMockDelegationChain([]);

      const result = calculateDelegationExpirationMs(delegationChain);

      // Should return 0 or negative (current time - current time)
      expect(result).toEqual(0);
    });

    it("should handle delegation chain with no delegations array", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const delegationChain = {
        delegations: [],
        publicKey: new Uint8Array(),
      } as unknown as DelegationChain;

      const result = calculateDelegationExpirationMs(delegationChain);

      expect(result).toEqual(0);
    });

    it("should handle very small expiration differences", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const time1 = BigInt(now + 1000) * NANOS_IN_MILLIS; // 1 second
      const time2 = BigInt(now + 1001) * NANOS_IN_MILLIS; // 1.001 seconds

      const delegationChain = createMockDelegationChain([time1, time2]);

      const result = calculateDelegationExpirationMs(delegationChain);

      expect(result).toEqual(1000);
    });

    it("should correctly convert nanoseconds to milliseconds", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Add exactly 1 second (1000ms = 1,000,000,000ns)
      const futureTime = now + 1000;
      const futureNs = BigInt(futureTime) * NANOS_IN_MILLIS;

      const delegationChain = createMockDelegationChain([futureNs]);

      const result = calculateDelegationExpirationMs(delegationChain);

      expect(result).toEqual(1000);
    });
  });

  describe("realistic scenarios", () => {
    it("should handle typical Internet Identity delegation (8 hours)", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const eightHoursMs = 8 * 60 * 60 * 1000;
      const futureTime = now + eightHoursMs;
      const futureNs = BigInt(futureTime) * NANOS_IN_MILLIS;

      const delegationChain = createMockDelegationChain([futureNs]);

      const result = calculateDelegationExpirationMs(delegationChain);

      expect(result).toBeGreaterThanOrEqual(eightHoursMs - 1000);
      expect(result).toBeLessThanOrEqual(eightHoursMs);
    });

    it("should handle delegation chain with 30-day maximum", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const futureTime = now + thirtyDaysMs;
      const futureNs = BigInt(futureTime) * NANOS_IN_MILLIS;

      const delegationChain = createMockDelegationChain([futureNs]);

      const result = calculateDelegationExpirationMs(delegationChain);

      expect(result).toBeGreaterThanOrEqual(thirtyDaysMs - 1000);
      expect(result).toBeLessThanOrEqual(thirtyDaysMs);
    });

    it("should handle session near expiration (last minute)", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const oneMinute = 60 * 1000;
      const futureTime = now + oneMinute;
      const futureNs = BigInt(futureTime) * NANOS_IN_MILLIS;

      const delegationChain = createMockDelegationChain([futureNs]);

      const result = calculateDelegationExpirationMs(delegationChain);

      expect(result).toBeGreaterThanOrEqual(59000);
      expect(result).toBeLessThanOrEqual(60000);
    });
  });
});
