import { describe, it, expect } from "vitest";
import {
  convertUsdToToken,
  convertTokenToUsd,
  parseTokenAmount,
} from "./amountConversion";

describe("amountConversion", () => {
  describe("convertUsdToToken", () => {
    it("should convert USD to token amount", () => {
      expect(convertUsdToToken(10, 2)).toBe("5");
      expect(convertUsdToToken("20", 5)).toBe("4");
    });

    it("should return empty string when priceUsd is missing or invalid", () => {
      expect(convertUsdToToken(10, undefined)).toBe("");
      expect(convertUsdToToken(10, 0)).toBe("");
      expect(convertUsdToToken(10, -1)).toBe("");
    });

    it("should return empty string when usdAmount is invalid", () => {
      expect(convertUsdToToken("abc", 2)).toBe("");
      expect(convertUsdToToken(0, 2)).toBe("");
      expect(convertUsdToToken(-5, 2)).toBe("");
    });
  });

  describe("convertTokenToUsd", () => {
    it("should convert token amount to USD", () => {
      const result = convertTokenToUsd(5, 2);
      expect(result).toBeTruthy();
      expect(result).toContain("10");
    });

    it("should return empty string when priceUsd is missing or invalid", () => {
      expect(convertTokenToUsd(5, undefined)).toBe("");
      expect(convertTokenToUsd(5, 0)).toBe("");
      expect(convertTokenToUsd(5, -1)).toBe("");
    });

    it("should return empty string when tokenAmount is invalid", () => {
      expect(convertTokenToUsd("abc", 2)).toBe("");
      expect(convertTokenToUsd(0, 2)).toBe("");
      expect(convertTokenToUsd(-5, 2)).toBe("");
    });
  });

  describe("parseTokenAmount", () => {
    it("should parse valid token amount strings", () => {
      expect(parseTokenAmount("1.23")).toBe(1.23);
      expect(parseTokenAmount("100")).toBe(100);
      expect(parseTokenAmount("0.0001")).toBe(0.0001);
    });

    it("should return 0 for invalid or empty strings", () => {
      expect(parseTokenAmount("")).toBe(0);
      expect(parseTokenAmount("abc")).toBe(0);
      expect(parseTokenAmount("0")).toBe(0);
      expect(parseTokenAmount("-5")).toBe(0);
    });
  });
});
