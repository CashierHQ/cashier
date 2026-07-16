import { describe, it, expect } from "vitest";
import { formatDate, getDateKey } from "$modules/wallet/utils/date";

describe("formatDate", () => {
  it("should format timestamp to readable date string", () => {
    const timestamp = new Date("2024-01-15T10:30:00Z").getTime();
    const result = formatDate(timestamp);
    expect(result).toBe("Jan 15, 2024");
  });

  it("should handle different months correctly", () => {
    const timestamp = new Date("2024-12-25T00:00:00Z").getTime();
    const result = formatDate(timestamp);
    expect(result).toBe("Dec 25, 2024");
  });

  it("should handle year transitions correctly", () => {
    const timestamp = new Date("2023-12-31T12:00:00Z").getTime();
    const result = formatDate(timestamp);
    expect(result).toBe("Dec 31, 2023");
  });
});

describe("getDateKey", () => {
  it("should generate consistent date key for same day", () => {
    const morning = new Date("2024-01-15T08:00:00Z").getTime();
    const evening = new Date("2024-01-15T20:00:00Z").getTime();

    expect(getDateKey(morning)).toBe(getDateKey(evening));
  });

  it("should generate different keys for different days", () => {
    const day1 = new Date("2024-01-15T10:00:00Z").getTime();
    const day2 = new Date("2024-01-16T10:00:00Z").getTime();

    expect(getDateKey(day1)).not.toBe(getDateKey(day2));
  });

  it("should generate key in correct format", () => {
    const timestamp = new Date("2024-01-15T10:00:00Z").getTime();
    const key = getDateKey(timestamp);

    // Key should contain a 4-digit year, month, and day
    expect(key).toMatch(/^\d{4}-\d{1,2}-\d{1,2}$/);
  });

  it("should not roll over across a UTC day boundary", () => {
    const justBeforeMidnight = new Date("2024-01-15T23:59:59.999Z").getTime();
    const justAfterMidnight = new Date("2024-01-16T00:00:00.000Z").getTime();

    expect(getDateKey(justBeforeMidnight)).not.toBe(
      getDateKey(justAfterMidnight),
    );
  });
});
