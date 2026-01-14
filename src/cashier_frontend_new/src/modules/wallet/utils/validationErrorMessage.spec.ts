import { describe, it, expect, vi, beforeEach } from "vitest";
import { getValidationErrorMessage } from "./validationErrorMessage";
import { locale } from "$lib/i18n";
import type { ValidationErrorType } from "$modules/token/services/canisterValidation";

// Mock the locale module
vi.mock("$lib/i18n", () => ({
  locale: {
    t: vi.fn((key: string) => key),
  },
}));

// Mock assertUnreachable
vi.mock("$lib/rsMatch", () => ({
  assertUnreachable: vi.fn((value: never) => {
    throw new Error(`Unhandled value: ${value}`);
  }),
}));

describe("getValidationErrorMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("error type mapping", () => {
    it("should map INVALID_LEDGER to correct i18n key", () => {
      const result = getValidationErrorMessage("INVALID_LEDGER");

      expect(result).toBe("wallet.import.errors.invalidLedgerCanister");
      expect(locale.t).toHaveBeenCalledWith(
        "wallet.import.errors.invalidLedgerCanister",
      );
    });

    it("should map INVALID_INDEX to correct i18n key", () => {
      const result = getValidationErrorMessage("INVALID_INDEX");

      expect(result).toBe("wallet.import.errors.invalidIndexCanister");
      expect(locale.t).toHaveBeenCalledWith(
        "wallet.import.errors.invalidIndexCanister",
      );
    });

    it("should map INDEX_LEDGER_MISMATCH to correct i18n key", () => {
      const result = getValidationErrorMessage("INDEX_LEDGER_MISMATCH");

      expect(result).toBe("wallet.import.errors.indexLedgerMismatch");
      expect(locale.t).toHaveBeenCalledWith(
        "wallet.import.errors.indexLedgerMismatch",
      );
    });

    it("should map TOKEN_EXISTS to correct i18n key", () => {
      const result = getValidationErrorMessage("TOKEN_EXISTS");

      expect(result).toBe("wallet.import.errors.tokenAlreadyExists");
      expect(locale.t).toHaveBeenCalledWith(
        "wallet.import.errors.tokenAlreadyExists",
      );
    });

    it("should map BACKEND_ERROR to correct i18n key", () => {
      const result = getValidationErrorMessage("BACKEND_ERROR");

      expect(result).toBe("wallet.import.errors.backendError");
      expect(locale.t).toHaveBeenCalledWith(
        "wallet.import.errors.backendError",
      );
    });
  });

  describe("exhaustiveness", () => {
    it("should handle all ValidationErrorType cases", () => {
      const errorTypes: ValidationErrorType[] = [
        "INVALID_LEDGER",
        "INVALID_INDEX",
        "INDEX_LEDGER_MISMATCH",
        "TOKEN_EXISTS",
        "BACKEND_ERROR",
      ];

      errorTypes.forEach((errorType) => {
        expect(() => getValidationErrorMessage(errorType)).not.toThrow();
      });
    });
  });

  describe("return values", () => {
    it("should return string values for all error types", () => {
      const errorTypes: ValidationErrorType[] = [
        "INVALID_LEDGER",
        "INVALID_INDEX",
        "INDEX_LEDGER_MISMATCH",
        "TOKEN_EXISTS",
        "BACKEND_ERROR",
      ];

      errorTypes.forEach((errorType) => {
        const result = getValidationErrorMessage(errorType);
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
        expect(result).toContain("wallet.import.errors.");
      });
    });

    it("should return different keys for different error types", () => {
      const results = new Set([
        getValidationErrorMessage("INVALID_LEDGER"),
        getValidationErrorMessage("INVALID_INDEX"),
        getValidationErrorMessage("INDEX_LEDGER_MISMATCH"),
        getValidationErrorMessage("TOKEN_EXISTS"),
        getValidationErrorMessage("BACKEND_ERROR"),
      ]);

      // All error types should map to unique keys
      expect(results.size).toBe(5);
    });
  });

  describe("locale integration", () => {
    it("should call locale.t exactly once per invocation", () => {
      getValidationErrorMessage("INVALID_LEDGER");

      expect(locale.t).toHaveBeenCalledTimes(1);
    });

    it("should pass only the translation key to locale.t", () => {
      getValidationErrorMessage("TOKEN_EXISTS");

      expect(locale.t).toHaveBeenCalledWith(
        "wallet.import.errors.tokenAlreadyExists",
      );
      // Ensure no additional arguments were passed
      expect(locale.t).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe("error message structure", () => {
    it("should follow consistent naming pattern for all error keys", () => {
      const errorTypes: ValidationErrorType[] = [
        "INVALID_LEDGER",
        "INVALID_INDEX",
        "INDEX_LEDGER_MISMATCH",
        "TOKEN_EXISTS",
        "BACKEND_ERROR",
      ];

      errorTypes.forEach((errorType) => {
        const result = getValidationErrorMessage(errorType);
        expect(result).toMatch(/^wallet\.import\.errors\.\w+$/);
      });
    });
  });
});
