import { getBackoffTimeText } from "$modules/gating/utils/backoffTime";
import { describe, expect, it, vi } from "vitest";

// Mirrors the real en.json shape ("{{count}} minutes" / "{{count}} seconds")
// so tests can verify the {{count}} substitution, not just key lookup.
vi.mock("$lib/i18n", () => ({
  locale: {
    t: (key: string) => `${key}:{{count}}`,
  },
}));

describe("getBackoffTimeText", () => {
  it("returns seconds text for 0 seconds", () => {
    expect(getBackoffTimeText(0)).toBe("links.linkForm.lock.otp.timeSeconds:0");
  });

  it("returns seconds text for values under a minute", () => {
    expect(getBackoffTimeText(45)).toBe(
      "links.linkForm.lock.otp.timeSeconds:45",
    );
  });

  it("returns seconds text for exactly 59 seconds", () => {
    expect(getBackoffTimeText(59)).toBe(
      "links.linkForm.lock.otp.timeSeconds:59",
    );
  });

  it("switches to minutes text at exactly 60 seconds", () => {
    expect(getBackoffTimeText(60)).toBe(
      "links.linkForm.lock.otp.timeMinutes:1",
    );
  });

  it("rounds up to the nearest minute", () => {
    expect(getBackoffTimeText(61)).toBe(
      "links.linkForm.lock.otp.timeMinutes:2",
    );
  });

  it("rounds up a value just under a whole number of minutes", () => {
    expect(getBackoffTimeText(119)).toBe(
      "links.linkForm.lock.otp.timeMinutes:2",
    );
  });

  it("returns exact minutes text with no rounding needed", () => {
    expect(getBackoffTimeText(120)).toBe(
      "links.linkForm.lock.otp.timeMinutes:2",
    );
  });

  it("handles large minute counts", () => {
    expect(getBackoffTimeText(3600)).toBe(
      "links.linkForm.lock.otp.timeMinutes:60",
    );
  });
});
