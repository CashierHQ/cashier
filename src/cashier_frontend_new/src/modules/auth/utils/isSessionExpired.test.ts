import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock constants before importing the util so the module gets deterministic values.
// TIMEOUT_NANO_SEC is 5_000_000_000 (nanoseconds) and NANOS_IN_MILLIS is 1_000_000 (nanoseconds in a ms)
// => timeoutMs = 5_000 ms
vi.mock("../constants", () => ({
  NANOS_IN_MILLIS: 1000000n,
  TIMEOUT_NANO_SEC: 5000000000n,
}));

import { isSessionExpired } from "./isSessionExpired";

describe("isSessionExpired util", () => {
  const now = 1_700_000_000_000; // fixed epoch ms for deterministic tests

  beforeEach(() => {
    // Freeze time
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("returns false for a timestamp in the future (not expired)", () => {
    const futureTs = now + 10000; // 10s in future
    expect(isSessionExpired(futureTs)).toBe(false);
  });

  it("returns true for a timestamp older than the timeout", () => {
    // Using mocked constants, timeoutMs = Number(5000000000n / 1000000n) = 5000 ms
    const timeoutMs = 5000;
    const oldTs = now - (timeoutMs + 1);
    expect(isSessionExpired(oldTs)).toBe(true);
  });

  it("returns true when timestamp is exactly at the expiration boundary", () => {
    const timeoutMs = 5000;
    const boundaryTs = now - timeoutMs;
    // implementation uses >= so exact boundary should be considered expired
    expect(isSessionExpired(boundaryTs)).toBe(true);
  });

  it("returns false when timestamp is just inside the non-expired window", () => {
    const timeoutMs = 5000;
    const insideTs = now - (timeoutMs - 1);
    expect(isSessionExpired(insideTs)).toBe(false);
  });
});
