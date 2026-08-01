import { describe, expect, it, vi } from "vitest";
import { hasBatchProgress } from "$modules/icrc112/utils/hasBatchProgress";

describe("hasBatchProgress", () => {
  it("returns true when the channel exposes an onBatchProgress function", () => {
    const channel = { onBatchProgress: vi.fn() };
    expect(hasBatchProgress(channel)).toBe(true);
  });

  it("returns false when the channel has no onBatchProgress property", () => {
    const channel = {};
    expect(hasBatchProgress(channel)).toBe(false);
  });

  it("returns false when onBatchProgress is not a function", () => {
    const channel = { onBatchProgress: "not-a-function" };
    expect(hasBatchProgress(channel)).toBe(false);
  });

  it("returns false for null", () => {
    expect(hasBatchProgress(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(hasBatchProgress(undefined)).toBe(false);
  });

  it("returns false for non-object primitives", () => {
    expect(hasBatchProgress("channel")).toBe(false);
    expect(hasBatchProgress(42)).toBe(false);
    expect(hasBatchProgress(true)).toBe(false);
  });
});
