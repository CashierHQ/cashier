import { describe, it, expect } from "vitest";
import { sanitizeNumericInput } from "./sanitize-numeric-input";

describe("sanitizeNumericInput", () => {
  describe("basic numeric input", () => {
    it("should return empty string for empty input", () => {
      expect(sanitizeNumericInput("")).toBe("");
    });

    it("should keep valid integers", () => {
      expect(sanitizeNumericInput("123")).toBe("123");
      expect(sanitizeNumericInput("0")).toBe("0");
      expect(sanitizeNumericInput("999999")).toBe("999999");
    });

    it("should keep valid decimals", () => {
      expect(sanitizeNumericInput("123.45")).toBe("123.45");
      expect(sanitizeNumericInput("0.001")).toBe("0.001");
      expect(sanitizeNumericInput("1.0")).toBe("1.0");
    });
  });

  describe("negative number handling", () => {
    it("should remove single leading minus", () => {
      expect(sanitizeNumericInput("-123")).toBe("123");
      expect(sanitizeNumericInput("-0.5")).toBe("0.5");
    });

    it("should remove multiple leading minuses", () => {
      expect(sanitizeNumericInput("--123")).toBe("123");
      expect(sanitizeNumericInput("---456")).toBe("456");
    });

    it("should remove minus only at start", () => {
      expect(sanitizeNumericInput("-1-2-3")).toBe("123");
    });
  });

  describe("decimal separator handling", () => {
    it("should convert comma to period", () => {
      expect(sanitizeNumericInput("123,45")).toBe("123.45");
      expect(sanitizeNumericInput("0,001")).toBe("0.001");
    });

    it("should keep only first decimal separator (period)", () => {
      expect(sanitizeNumericInput("123.45.67")).toBe("123.4567");
      expect(sanitizeNumericInput("1.2.3.4")).toBe("1.234");
    });

    it("should keep only first decimal separator (comma)", () => {
      expect(sanitizeNumericInput("123,45,67")).toBe("123.4567");
    });

    it("should handle mixed decimal separators", () => {
      expect(sanitizeNumericInput("123.45,67")).toBe("123.4567");
      expect(sanitizeNumericInput("123,45.67")).toBe("123.4567");
    });

    it("should handle leading decimal", () => {
      expect(sanitizeNumericInput(".5")).toBe(".5");
      expect(sanitizeNumericInput(",5")).toBe(".5");
    });

    it("should handle trailing decimal", () => {
      expect(sanitizeNumericInput("5.")).toBe("5.");
      expect(sanitizeNumericInput("5,")).toBe("5.");
    });
  });

  describe("invalid character filtering", () => {
    it("should remove letters", () => {
      expect(sanitizeNumericInput("12abc34")).toBe("1234");
      expect(sanitizeNumericInput("abc")).toBe("");
      expect(sanitizeNumericInput("1a2b3c")).toBe("123");
    });

    it("should remove special characters", () => {
      expect(sanitizeNumericInput("12$34")).toBe("1234");
      expect(sanitizeNumericInput("1@2#3")).toBe("123");
      expect(sanitizeNumericInput("100%")).toBe("100");
    });

    it("should remove spaces", () => {
      expect(sanitizeNumericInput("1 2 3")).toBe("123");
      expect(sanitizeNumericInput(" 123 ")).toBe("123");
      expect(sanitizeNumericInput("1 000")).toBe("1000");
    });

    it("should remove currency symbols", () => {
      expect(sanitizeNumericInput("$100")).toBe("100");
      expect(sanitizeNumericInput("€50")).toBe("50");
      expect(sanitizeNumericInput("100$")).toBe("100");
    });

    it("should handle plus sign", () => {
      expect(sanitizeNumericInput("+123")).toBe("123");
      expect(sanitizeNumericInput("1+2")).toBe("12");
    });
  });

  describe("edge cases", () => {
    it("should handle only invalid characters", () => {
      expect(sanitizeNumericInput("abc!@#")).toBe("");
      expect(sanitizeNumericInput("   ")).toBe("");
    });

    it("should handle very long numbers", () => {
      const longNumber = "1234567890123456789012345678901234567890";
      expect(sanitizeNumericInput(longNumber)).toBe(longNumber);
    });

    it("should handle very small decimals", () => {
      expect(sanitizeNumericInput("0.0000001")).toBe("0.0000001");
    });

    it("should handle negative with decimal", () => {
      expect(sanitizeNumericInput("-0.5")).toBe("0.5");
      expect(sanitizeNumericInput("-123.456")).toBe("123.456");
    });

    it("should handle only decimal separator", () => {
      expect(sanitizeNumericInput(".")).toBe(".");
      expect(sanitizeNumericInput(",")).toBe(".");
    });

    it("should handle only minus", () => {
      expect(sanitizeNumericInput("-")).toBe("");
      expect(sanitizeNumericInput("--")).toBe("");
    });

    it("should handle zero variations", () => {
      expect(sanitizeNumericInput("0")).toBe("0");
      expect(sanitizeNumericInput("00")).toBe("00");
      expect(sanitizeNumericInput("0.0")).toBe("0.0");
      expect(sanitizeNumericInput("0.00")).toBe("0.00");
    });
  });

  describe("real-world input scenarios", () => {
    it("should treat first separator as decimal (comma becomes period)", () => {
      // Note: This function treats first comma/period as decimal separator
      // For pasted values with thousands separators, pre-processing needed
      expect(sanitizeNumericInput("1,000.50")).toBe("1.00050");
      expect(sanitizeNumericInput("$1,234.56")).toBe("1.23456");
    });

    it("should handle scientific notation input (as string)", () => {
      expect(sanitizeNumericInput("1e5")).toBe("15");
      expect(sanitizeNumericInput("1.5e-3")).toBe("1.53");
    });

    it("should handle unicode digits", () => {
      // Standard ASCII digits only
      expect(sanitizeNumericInput("①②③")).toBe("");
    });
  });
});
