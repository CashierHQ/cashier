import { describe, it, expect } from "vitest";
import { formatDate } from "./formatDate";

describe("formatDate", () => {
  it("formats valid nanosecond timestamp to date string", () => {
    // January 1, 2023 00:00:00 UTC in nanoseconds
    const timestampNs = 1672531200000000000n;
    const result = formatDate(timestampNs);
    expect(result).toBe("Jan 1, 2023");
  });

  it("returns empty string for zero timestamp", () => {
    const result = formatDate(0n);
    expect(result).toBe("");
  });

  it("formats another valid date correctly", () => {
    // November 10, 2025 00:00:00 UTC in nanoseconds
    const timestampNs = 1762732800000000000n;
    const result = formatDate(timestampNs);
    expect(result).toBe("Nov 10, 2025");
  });

  it("formats date with time component correctly", () => {
    // January 15, 2023 12:30:45 UTC in nanoseconds
    const timestampNs = 1673783445000000000n;
    const result = formatDate(timestampNs);
    expect(result).toBe("Jan 15, 2023");
  });
});
