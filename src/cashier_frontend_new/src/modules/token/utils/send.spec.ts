import { describe, it, expect, vi, beforeEach } from "vitest";
import { validate } from "./send";
import { locale } from "$lib/i18n";

vi.mock("$lib/i18n", () => ({
  locale: {
    t: vi.fn(),
  },
}));

describe("validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error when selectedToken is empty", () => {
    vi.mocked(locale.t).mockReturnValue("Please select a token");

    const result = validate({
      selectedToken: "",
      receiveAddress: "0x123",
      amount: 10,
      maxAmount: 100,
    });

    expect(result).toEqual({
      success: false,
      errorMessage: "Please select a token",
    });
    expect(locale.t).toHaveBeenCalledWith("wallet.send.errors.selectToken");
  });

  it("should return error when selectedToken is only whitespace", () => {
    vi.mocked(locale.t).mockReturnValue("Please select a token");

    const result = validate({
      selectedToken: "   ",
      receiveAddress: "0x123",
      amount: 10,
      maxAmount: 100,
    });

    expect(result).toEqual({
      success: false,
      errorMessage: "Please select a token",
    });
  });

  it("should return error when receiveAddress is empty", () => {
    vi.mocked(locale.t).mockReturnValue("Please enter an address");

    const result = validate({
      selectedToken: "ETH",
      receiveAddress: "",
      amount: 10,
      maxAmount: 100,
    });

    expect(result).toEqual({
      success: false,
      errorMessage: "Please enter an address",
    });
    expect(locale.t).toHaveBeenCalledWith("wallet.send.errors.enterAddress");
  });

  it("should return error when receiveAddress is only whitespace", () => {
    vi.mocked(locale.t).mockReturnValue("Please enter an address");

    const result = validate({
      selectedToken: "ETH",
      receiveAddress: "   ",
      amount: 10,
      maxAmount: 100,
    });

    expect(result).toEqual({
      success: false,
      errorMessage: "Please enter an address",
    });
  });

  it("should return error when amount is zero", () => {
    vi.mocked(locale.t).mockReturnValue("Amount must be greater than zero");

    const result = validate({
      selectedToken: "ETH",
      receiveAddress: "0x123",
      amount: 0,
      maxAmount: 100,
    });

    expect(result).toEqual({
      success: false,
      errorMessage: "Amount must be greater than zero",
    });
    expect(locale.t).toHaveBeenCalledWith(
      "wallet.send.errors.amountGreaterThanZero",
    );
  });

  it("should return error when amount is negative", () => {
    vi.mocked(locale.t).mockReturnValue("Amount must be greater than zero");

    const result = validate({
      selectedToken: "ETH",
      receiveAddress: "0x123",
      amount: -5,
      maxAmount: 100,
    });

    expect(result).toEqual({
      success: false,
      errorMessage: "Amount must be greater than zero",
    });
  });

  it("should return error when amount exceeds maxAmount", () => {
    vi.mocked(locale.t).mockReturnValue("Amount exceeds maximum {{max}}");

    const result = validate({
      selectedToken: "ETH",
      receiveAddress: "0x123",
      amount: 150,
      maxAmount: 100,
    });

    expect(result).toEqual({
      success: false,
      errorMessage: "Amount exceeds maximum 100",
    });
    expect(locale.t).toHaveBeenCalledWith(
      "wallet.send.errors.amountExceedsMax",
    );
  });

  it("should return success when all validations pass", () => {
    const result = validate({
      selectedToken: "ETH",
      receiveAddress: "0x123",
      amount: 50,
      maxAmount: 100,
    });

    expect(result).toEqual({
      success: true,
    });
    expect(locale.t).not.toHaveBeenCalled();
  });

  it("should return success when amount equals maxAmount", () => {
    const result = validate({
      selectedToken: "ETH",
      receiveAddress: "0x123",
      amount: 100,
      maxAmount: 100,
    });

    expect(result).toEqual({
      success: true,
    });
  });
});
