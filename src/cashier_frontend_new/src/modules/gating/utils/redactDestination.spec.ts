import { describe, expect, it } from "vitest";
import { redactDestination } from "./redactDestination";

const DOTS = "•••••";

describe("redactDestination — email", () => {
  it("redacts a typical email keeping first char, last 4 of local part, and full domain", () => {
    expect(redactDestination("htsvnn@gmail.com", true)).toBe(`h${DOTS}svnn@gmail.com`);
  });

  it("redacts an email whose local part has exactly 5 chars", () => {
    expect(redactDestination("abcde@example.org", true)).toBe(`a${DOTS}bcde@example.org`);
  });

  it("redacts an email with a long local part", () => {
    // local="john.doe.smith", last 4="mith"
    expect(redactDestination("john.doe.smith@company.com", true)).toBe(`j${DOTS}mith@company.com`);
  });

  it("returns unchanged when local part is a single character", () => {
    expect(redactDestination("a@b.com", true)).toBe("a@b.com");
  });

  it("falls back to full-string redaction when there is no @ sign", () => {
    // "notanemail" → last 4 chars = "mail"
    expect(redactDestination("notanemail", true)).toBe(`n${DOTS}mail`);
  });

  it("returns empty string unchanged", () => {
    expect(redactDestination("", true)).toBe("");
  });
});

describe("redactDestination — phone", () => {
  it("redacts a Vietnamese number keeping dial code + first local digit and last 4 digits", () => {
    expect(redactDestination("+84904753454", false)).toBe(`+849${DOTS}3454`);
  });

  it("redacts a US number (single-digit country code)", () => {
    expect(redactDestination("+14155550100", false)).toBe(`+14${DOTS}0100`);
  });

  it("redacts a UK number (two-digit country code)", () => {
    expect(redactDestination("+447911123456", false)).toBe(`+447${DOTS}3456`);
  });

  it("redacts a number with a 3-digit country code", () => {
    // +359 is Bulgaria
    expect(redactDestination("+35912345678", false)).toBe(`+3591${DOTS}5678`);
  });

  it("falls back gracefully when number has no + prefix", () => {
    expect(redactDestination("0904753454", false)).toBe(`0${DOTS}3454`);
  });

  it("returns empty string unchanged", () => {
    expect(redactDestination("", false)).toBe("");
  });
});
