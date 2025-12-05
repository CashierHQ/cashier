import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

  it("returns false when expiration timestamp is in the future", () => {
    const futureTs = now + 10000; // expires 10s from now
    expect(isSessionExpired(futureTs)).toBe(false);
  });

  it("returns true when expiration timestamp is in the past", () => {
    const pastTs = now - 1000; // expired 1s ago
    expect(isSessionExpired(pastTs)).toBe(true);
  });

  it("returns true when current time equals expiration timestamp", () => {
    // implementation uses >= so exact boundary should be considered expired
    expect(isSessionExpired(now)).toBe(true);
  });

  it("returns false when expiration is 1ms in the future", () => {
    const almostExpired = now + 1;
    expect(isSessionExpired(almostExpired)).toBe(false);
  });

  it("returns true when expiration was 1ms ago", () => {
    const justExpired = now - 1;
    expect(isSessionExpired(justExpired)).toBe(true);
  });
});
