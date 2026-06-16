import { describe, expect, it, vi } from "vitest";
import { formatActionError } from "./formatActionError";

// Identity translator: returns the i18n key so we can assert which case matched.
const t = (key: string) => key;
const PREFIX = "links.linkForm.drawers.txCart.action.errors";

describe("formatActionError", () => {
  it("maps LinkNoUseAvailable (wrapped) → alreadyClaimed", () => {
    const raw =
      'Failed to process action: Error: {"LinkNoUseAvailable":{"link_id":"ba9acc4f"}}';
    expect(formatActionError([raw], t)).toBe(`${PREFIX}.alreadyClaimed`);
  });

  it("maps LinkNoUseAvailable (bare JSON) → alreadyClaimed", () => {
    const raw = '{"LinkNoUseAvailable":{"link_id":"x"}}';
    expect(formatActionError([raw], t)).toBe(`${PREFIX}.alreadyClaimed`);
  });

  it("maps InsufficientBalance → insufficientFunds", () => {
    const raw = '{"InsufficientBalance":{"available":1,"required":2}}';
    expect(formatActionError([raw], t)).toBe(`${PREFIX}.insufficientFunds`);
  });

  it("maps ValidationErrors unsupported-state text → linkUnavailable", () => {
    const raw = '{"ValidationErrors":"Unsupported link state INACTIVE"}';
    expect(formatActionError([raw], t)).toBe(`${PREFIX}.linkUnavailable`);
  });

  it("falls back to generic for unmapped variants/text", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(formatActionError(['{"NotFound":"link 123"}'], t)).toBe(
      `${PREFIX}.generic`,
    );
    expect(formatActionError(["totally unparseable"], t)).toBe(
      `${PREFIX}.generic`,
    );
    spy.mockRestore();
  });

  it("returns first matching variant across multiple errors", () => {
    const errors = [
      "noise without json",
      '{"LinkNoUseAvailable":{"link_id":"x"}}',
    ];
    expect(formatActionError(errors, t)).toBe(`${PREFIX}.alreadyClaimed`);
  });
});
