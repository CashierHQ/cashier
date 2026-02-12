import { describe, it, expect } from "vitest";
import { IDL } from "@dfinity/candid";
import { parseIcrc1TransferError } from "./icrc-1-parser";
import {
  parseIcrc2ApproveError,
  parseIcrc2TransferFromError,
} from "./icrc-2-parser";
import { parseIcrc7TransferError } from "./icrc-7-parser";
import {
  parseIcrc37ApproveTokenError,
  parseIcrc37TransferFromError,
} from "./icrc-37-parser";
import { parseIcrcError } from "./index";

/** Helper: encode a candid Err variant to ArrayBuffer */
function encodeErr(
  errVariant: Record<string, IDL.Type>,
  variantName: string,
  value: unknown,
): ArrayBuffer {
  const errType = IDL.Variant({
    Err: IDL.Variant(errVariant),
  });
  return new Uint8Array(
    IDL.encode([errType], [{ Err: { [variantName]: value } }]),
  ).buffer;
}

/** Helper: encode a candid Ok variant (success response) */
function encodeOk(): ArrayBuffer {
  const okType = IDL.Variant({ Ok: IDL.Nat });
  return new Uint8Array(IDL.encode([okType], [{ Ok: BigInt(42) }])).buffer;
}

describe("ICRC-1 parser", () => {
  const variants = {
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
    TooOld: IDL.Null,
    GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
  };

  it("parses InsufficientFunds", () => {
    const buf = encodeErr(variants, "InsufficientFunds", { balance: 500n });
    const result = parseIcrc1TransferError(buf);
    expect(result).not.toBeNull();
    expect(result!.variant).toBe("InsufficientFunds");
    expect(result!.details).toEqual({ balance: 500n });
  });

  it("parses TooOld (null-detail variant)", () => {
    const buf = encodeErr(variants, "TooOld", null);
    const result = parseIcrc1TransferError(buf);
    expect(result).not.toBeNull();
    expect(result!.variant).toBe("TooOld");
  });

  it("parses GenericError", () => {
    const buf = encodeErr(variants, "GenericError", {
      error_code: 1n,
      message: "fail",
    });
    const result = parseIcrc1TransferError(buf);
    expect(result!.variant).toBe("GenericError");
    expect(result!.details).toEqual({ error_code: 1n, message: "fail" });
  });

  it("returns null for Ok response", () => {
    const buf = encodeOk();
    expect(parseIcrc1TransferError(buf)).toBeNull();
  });
});

describe("ICRC-2 parser", () => {
  it("parses ApproveError AllowanceChanged", () => {
    const variants = {
      AllowanceChanged: IDL.Record({ current_allowance: IDL.Nat }),
      TooOld: IDL.Null,
    };
    const buf = encodeErr(variants, "AllowanceChanged", {
      current_allowance: 200n,
    });
    const result = parseIcrc2ApproveError(buf);
    expect(result!.variant).toBe("AllowanceChanged");
    expect(result!.details).toEqual({ current_allowance: 200n });
  });

  it("parses TransferFromError InsufficientAllowance", () => {
    const variants = {
      InsufficientAllowance: IDL.Record({ allowance: IDL.Nat }),
      TooOld: IDL.Null,
    };
    const buf = encodeErr(variants, "InsufficientAllowance", {
      allowance: 50n,
    });
    const result = parseIcrc2TransferFromError(buf);
    expect(result!.variant).toBe("InsufficientAllowance");
    expect(result!.details).toEqual({ allowance: 50n });
  });

  it("returns null for Ok response", () => {
    expect(parseIcrc2ApproveError(encodeOk())).toBeNull();
    expect(parseIcrc2TransferFromError(encodeOk())).toBeNull();
  });
});

describe("ICRC-7 parser", () => {
  it("parses NonExistingTokenId", () => {
    const variants = {
      NonExistingTokenId: IDL.Null,
      Unauthorized: IDL.Null,
    };
    const buf = encodeErr(variants, "NonExistingTokenId", null);
    const result = parseIcrc7TransferError(buf);
    expect(result!.variant).toBe("NonExistingTokenId");
    expect(result!.details).toBeNull();
  });

  it("parses GenericBatchError", () => {
    const variants = {
      GenericBatchError: IDL.Record({
        error_code: IDL.Nat,
        message: IDL.Text,
      }),
      TooOld: IDL.Null,
    };
    const buf = encodeErr(variants, "GenericBatchError", {
      error_code: 5n,
      message: "batch err",
    });
    const result = parseIcrc7TransferError(buf);
    expect(result!.variant).toBe("GenericBatchError");
  });
});

describe("ICRC-37 parser", () => {
  it("parses ApproveTokenError InvalidSpender", () => {
    const variants = {
      InvalidSpender: IDL.Null,
      TooOld: IDL.Null,
    };
    const buf = encodeErr(variants, "InvalidSpender", null);
    const result = parseIcrc37ApproveTokenError(buf);
    expect(result!.variant).toBe("InvalidSpender");
  });

  it("parses TransferFromError Unauthorized", () => {
    const variants = {
      Unauthorized: IDL.Null,
      NonExistingTokenId: IDL.Null,
    };
    const buf = encodeErr(variants, "Unauthorized", null);
    const result = parseIcrc37TransferFromError(buf);
    expect(result!.variant).toBe("Unauthorized");
  });
});

describe("Method-based dispatch (index)", () => {
  const icrc1Variants = {
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
    TooOld: IDL.Null,
  };

  it("dispatches icrc1_transfer to ICRC-1 parser", () => {
    const buf = encodeErr(icrc1Variants, "InsufficientFunds", { balance: 100n });
    const result = parseIcrcError("icrc1_transfer", buf);
    expect(result).not.toBeNull();
    expect(result!.variant).toBe("InsufficientFunds");
  });

  it("dispatches icrc2_approve to ICRC-2 parser", () => {
    const variants = {
      AllowanceChanged: IDL.Record({ current_allowance: IDL.Nat }),
      TooOld: IDL.Null,
    };
    const buf = encodeErr(variants, "AllowanceChanged", { current_allowance: 50n });
    const result = parseIcrcError("icrc2_approve", buf);
    expect(result!.variant).toBe("AllowanceChanged");
  });

  it("dispatches icrc7_transfer to ICRC-7 parser", () => {
    const variants = { NonExistingTokenId: IDL.Null, TooOld: IDL.Null };
    const buf = encodeErr(variants, "NonExistingTokenId", null);
    const result = parseIcrcError("icrc7_transfer", buf);
    expect(result!.variant).toBe("NonExistingTokenId");
  });

  it("returns null for unknown method", () => {
    const buf = encodeErr(icrc1Variants, "TooOld", null);
    expect(parseIcrcError("unknown_method", buf)).toBeNull();
  });
});
