import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Principal } from "@dfinity/principal";
import type { IcrcTokenMetadata } from "@dfinity/ledger-icrc";
import {
  ValidationError,
  validateLedgerCanister,
  validateIndexCanister,
} from "./canister-validation";

// Mock @dfinity/ledger-icrc
vi.mock("@dfinity/ledger-icrc", () => ({
  IcrcLedgerCanister: {
    create: vi.fn(),
  },
  IcrcIndexNgCanister: {
    create: vi.fn(),
  },
  mapTokenMetadata: vi.fn(),
}));

// Mock authState
vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    buildAnonymousAgent: vi.fn(() => ({})),
  },
}));

// Import mocked modules after vi.mock
import {
  IcrcLedgerCanister,
  IcrcIndexNgCanister,
  mapTokenMetadata,
} from "@dfinity/ledger-icrc";

const VALID_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const VALID_LEDGER_ID = "mxzaz-hqaaa-aaaar-qaada-cai";

describe("ValidationError", () => {
  it("should have INVALID_LEDGER constant", () => {
    expect(ValidationError.INVALID_LEDGER).toBe("INVALID_LEDGER");
  });

  it("should have INVALID_INDEX constant", () => {
    expect(ValidationError.INVALID_INDEX).toBe("INVALID_INDEX");
  });

  it("should have INDEX_LEDGER_MISMATCH constant", () => {
    expect(ValidationError.INDEX_LEDGER_MISMATCH).toBe("INDEX_LEDGER_MISMATCH");
  });

  it("should have TOKEN_EXISTS constant", () => {
    expect(ValidationError.TOKEN_EXISTS).toBe("TOKEN_EXISTS");
  });

  it("should have BACKEND_ERROR constant", () => {
    expect(ValidationError.BACKEND_ERROR).toBe("BACKEND_ERROR");
  });
});

describe("validateLedgerCanister", () => {
  const mockMetadata: IcrcTokenMetadata = {
    name: "Test Token",
    symbol: "TEST",
    decimals: 8,
    fee: BigInt(10000),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return Ok with metadata when ledger is valid", async () => {
    const mockLedger = {
      metadata: vi.fn().mockResolvedValue([["icrc1:name", "Test Token"]]),
    };
    vi.mocked(IcrcLedgerCanister.create).mockReturnValue(
      mockLedger as unknown as ReturnType<typeof IcrcLedgerCanister.create>,
    );
    vi.mocked(mapTokenMetadata).mockReturnValue(mockMetadata);

    const result = await validateLedgerCanister(VALID_CANISTER_ID);

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual(mockMetadata);
    expect(mockLedger.metadata).toHaveBeenCalledWith({ certified: false });
  });

  it("should return Err INVALID_LEDGER when metadata is empty", async () => {
    const mockLedger = {
      metadata: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(IcrcLedgerCanister.create).mockReturnValue(
      mockLedger as unknown as ReturnType<typeof IcrcLedgerCanister.create>,
    );

    const result = await validateLedgerCanister(VALID_CANISTER_ID);

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe(ValidationError.INVALID_LEDGER);
  });

  it("should return Err INVALID_LEDGER when metadata is null", async () => {
    const mockLedger = {
      metadata: vi.fn().mockResolvedValue(null),
    };
    vi.mocked(IcrcLedgerCanister.create).mockReturnValue(
      mockLedger as unknown as ReturnType<typeof IcrcLedgerCanister.create>,
    );

    const result = await validateLedgerCanister(VALID_CANISTER_ID);

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe(ValidationError.INVALID_LEDGER);
  });

  it("should return Err INVALID_LEDGER when mapTokenMetadata returns null", async () => {
    const mockLedger = {
      metadata: vi.fn().mockResolvedValue([["icrc1:name", "Test"]]),
    };
    vi.mocked(IcrcLedgerCanister.create).mockReturnValue(
      mockLedger as unknown as ReturnType<typeof IcrcLedgerCanister.create>,
    );
    vi.mocked(mapTokenMetadata).mockReturnValue(undefined);

    const result = await validateLedgerCanister(VALID_CANISTER_ID);

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe(ValidationError.INVALID_LEDGER);
  });

  it("should return Err INVALID_LEDGER when canister call throws", async () => {
    const mockLedger = {
      metadata: vi.fn().mockRejectedValue(new Error("Canister not found")),
    };
    vi.mocked(IcrcLedgerCanister.create).mockReturnValue(
      mockLedger as unknown as ReturnType<typeof IcrcLedgerCanister.create>,
    );

    const result = await validateLedgerCanister(VALID_CANISTER_ID);

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe(ValidationError.INVALID_LEDGER);
  });

  it("should return Err INVALID_LEDGER for invalid principal format", async () => {
    vi.mocked(IcrcLedgerCanister.create).mockImplementation(() => {
      throw new Error("Invalid principal");
    });

    const result = await validateLedgerCanister("invalid-principal");

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe(ValidationError.INVALID_LEDGER);
  });
});

describe("validateIndexCanister", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return Ok with ledgerId when index is valid and matches expected ledger", async () => {
    const expectedLedgerId = Principal.fromText(VALID_LEDGER_ID);
    const mockIndexCanister = {
      ledgerId: vi.fn().mockResolvedValue(expectedLedgerId),
    };
    vi.mocked(IcrcIndexNgCanister.create).mockReturnValue(
      mockIndexCanister as unknown as ReturnType<
        typeof IcrcIndexNgCanister.create
      >,
    );

    const result = await validateIndexCanister(VALID_CANISTER_ID, VALID_LEDGER_ID);

    expect(result.isOk()).toBe(true);
    expect(result.unwrap().toText()).toBe(VALID_LEDGER_ID);
    expect(mockIndexCanister.ledgerId).toHaveBeenCalledWith({
      certified: false,
    });
  });

  it("should return Err INDEX_LEDGER_MISMATCH when ledger id does not match", async () => {
    const differentLedgerId = Principal.fromText(VALID_CANISTER_ID);
    const mockIndexCanister = {
      ledgerId: vi.fn().mockResolvedValue(differentLedgerId),
    };
    vi.mocked(IcrcIndexNgCanister.create).mockReturnValue(
      mockIndexCanister as unknown as ReturnType<
        typeof IcrcIndexNgCanister.create
      >,
    );

    const result = await validateIndexCanister(VALID_CANISTER_ID, VALID_LEDGER_ID);

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe(ValidationError.INDEX_LEDGER_MISMATCH);
  });

  it("should return Err INVALID_INDEX when canister call throws", async () => {
    const mockIndexCanister = {
      ledgerId: vi.fn().mockRejectedValue(new Error("Not an index canister")),
    };
    vi.mocked(IcrcIndexNgCanister.create).mockReturnValue(
      mockIndexCanister as unknown as ReturnType<
        typeof IcrcIndexNgCanister.create
      >,
    );

    const result = await validateIndexCanister(VALID_CANISTER_ID, VALID_LEDGER_ID);

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe(ValidationError.INVALID_INDEX);
  });

  it("should return Err INVALID_INDEX for invalid principal format", async () => {
    vi.mocked(IcrcIndexNgCanister.create).mockImplementation(() => {
      throw new Error("Invalid principal");
    });

    const result = await validateIndexCanister(
      "invalid-principal",
      VALID_LEDGER_ID,
    );

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe(ValidationError.INVALID_INDEX);
  });

  it("should handle network errors gracefully", async () => {
    const mockIndexCanister = {
      ledgerId: vi.fn().mockRejectedValue(new Error("Network timeout")),
    };
    vi.mocked(IcrcIndexNgCanister.create).mockReturnValue(
      mockIndexCanister as unknown as ReturnType<
        typeof IcrcIndexNgCanister.create
      >,
    );

    const result = await validateIndexCanister(VALID_CANISTER_ID, VALID_LEDGER_ID);

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe(ValidationError.INVALID_INDEX);
  });
});
