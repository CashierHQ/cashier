/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Principal } from "@icp-sdk/core/principal";

// Hoisted mock functions
const {
  mockBuildActor,
  mockUserCreateBridgeTransaction,
  mockUserGetBridgeTransactions,
} = vi.hoisted(() => ({
  mockBuildActor: vi.fn(),
  mockUserCreateBridgeTransaction: vi.fn(),
  mockUserGetBridgeTransactions: vi.fn(),
}));

const {
  mockValidateLedgerCanister,
  mockValidateIndexCanister,
  mockUserAddToken,
} = vi.hoisted(() => ({
  mockValidateLedgerCanister: vi.fn(),
  mockValidateIndexCanister: vi.fn(),
  mockUserAddToken: vi.fn(),
}));

// Mock auth state
vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    account: { owner: "aaaaa-aa", subaccount: null },
    buildActor: mockBuildActor,
  },
}));

// Mock token_storage generated bindings
vi.mock("$lib/generated/token_storage/token_storage.did", () => ({
  idlFactory: vi.fn(),
}));

// Mock constants
vi.mock("$modules/shared/constants", () => ({
  TOKEN_STORAGE_CANISTER_ID: "aaaaa-aa",
}));

vi.mock("$modules/token/services/canisterValidation", () => ({
  validateLedgerCanister: mockValidateLedgerCanister,
  validateIndexCanister: mockValidateIndexCanister,
  ValidationError: {
    BACKEND_ERROR: "BACKEND_ERROR",
    INVALID_LEDGER: "INVALID_LEDGER",
    INVALID_INDEX_CANISTER: "INVALID_INDEX_CANISTER",
    INDEX_LEDGER_MISMATCH: "INDEX_LEDGER_MISMATCH",
    TOKEN_EXISTS: "TOKEN_EXISTS",
  },
}));

vi.mock("ts-results-es", async () => {
  const actual = await vi.importActual("ts-results-es");
  return actual;
});

// Fixtures
function fixture_of_bridge_transaction_dto(
  overrides: Record<string, unknown> = {},
) {
  return {
    bridge_id: "import_ckbtc_123",
    icp_address: Principal.fromText("aaaaa-aa"),
    btc_address: "tb1qreceiver",
    bridge_type: { Import: null },
    asset_infos: [
      {
        asset_type: { BTC: null },
        asset_id: "UTXO",
        amount: 50000n,
        decimals: 8,
      },
    ],
    btc_txid: [],
    ckbtc_block_id: [123n],
    block_id: [],
    block_timestamp: [],
    block_confirmations: [],
    deposit_fee: [1000n],
    withdrawal_fee: [],
    btc_fee: [],
    created_at_ts: 1000n,
    total_amount: [50000n],
    retry_times: 0,
    status: { Completed: null },
    omnity_ticket_id: [],
    vin: [],
    vout: [],
    ...overrides,
  };
}

describe("TokenStorageService.createManualImportBridgeTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("it_should_fail_create_manual_import_bridge_due_to_not_authenticated", async () => {
    // Arrange
    mockBuildActor.mockReturnValue(null);
    const { tokenStorageService } =
      await import("$modules/token/services/tokenStorage");

    // Act
    const result =
      await tokenStorageService.createManualImportBridgeTransaction(
        "tb1qreceiver",
        50000n,
        123n,
        1000n,
        "deadbeef",
      );

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toContain("not authenticated");
  });

  it("it_should_create_manual_import_bridge_transaction", async () => {
    // Arrange
    const dto = fixture_of_bridge_transaction_dto();
    mockUserCreateBridgeTransaction.mockResolvedValue({ Ok: dto });
    mockBuildActor.mockReturnValue({
      user_create_bridge_transaction: mockUserCreateBridgeTransaction,
    });
    const { tokenStorageService } =
      await import("$modules/token/services/tokenStorage");

    // Act
    const result =
      await tokenStorageService.createManualImportBridgeTransaction(
        "tb1qreceiver",
        50000n,
        123n,
        1000n,
        "deadbeef",
      );

    // Assert
    expect(result.isOk()).toBe(true);
    const bridge = result.unwrap();
    expect(bridge.bridge_id).toBe("import_ckbtc_123");
    expect(bridge.status).toBe("Completed");

    // Verify correct args were passed to canister
    const callArgs = mockUserCreateBridgeTransaction.mock.calls[0][0];
    expect(callArgs.bridge_type).toEqual({ Import: null });
    expect(callArgs.ckbtc_block_id).toEqual([123n]);
    expect(callArgs.status).toEqual([{ Completed: null }]);
    expect(callArgs.btc_txid).toEqual(["deadbeef"]);
    expect(callArgs.deposit_fee).toEqual([1000n]);
    expect(callArgs.omnity_ticket_id).toEqual([]);
  });

  it("it_should_fail_create_manual_import_bridge_due_to_canister_error", async () => {
    // Arrange
    mockUserCreateBridgeTransaction.mockResolvedValue({
      Err: { ValidationErrors: "ckbtc_block_id already exists" },
    });
    mockBuildActor.mockReturnValue({
      user_create_bridge_transaction: mockUserCreateBridgeTransaction,
    });
    const { tokenStorageService } =
      await import("$modules/token/services/tokenStorage");

    // Act
    const result =
      await tokenStorageService.createManualImportBridgeTransaction(
        "tb1qreceiver",
        50000n,
        123n,
        1000n,
        "deadbeef",
      );

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toContain("Error creating manual import bridge");
  });
});

describe("TokenStorageService.addToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateLedgerCanister.mockResolvedValue({ isErr: () => false });
    mockValidateIndexCanister.mockResolvedValue({ isErr: () => false });
  });

  it("should send rune metadata when adding a rune token", async () => {
    mockUserAddToken.mockResolvedValue({ Ok: null });
    mockBuildActor.mockReturnValue({
      user_add_token: mockUserAddToken,
    });

    const { tokenStorageService } =
      await import("$modules/token/services/tokenStorage");

    const result = await tokenStorageService.addToken(
      Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai"),
      "qhbym-qaaaa-aaaaa-aaafq-cai",
      [],
      true,
      "UNCOMMON•GOODS",
      "omnity-rune-id",
    );

    expect(result.isOk()).toBe(true);
    expect(mockUserAddToken).toHaveBeenCalledWith({
      token_id: {
        IC: { ledger_id: Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai") },
      },
      index_id: ["qhbym-qaaaa-aaaaa-aaafq-cai"],
      is_rune: [true],
      rune_info: [
        { rune_id: "UNCOMMON•GOODS", token_id: "omnity-rune-id", icon: [] },
      ],
    });
  });

  it("should omit rune metadata when adding a non-rune token", async () => {
    mockUserAddToken.mockResolvedValue({ Ok: null });
    mockBuildActor.mockReturnValue({
      user_add_token: mockUserAddToken,
    });

    const { tokenStorageService } =
      await import("$modules/token/services/tokenStorage");

    const result = await tokenStorageService.addToken(
      Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai"),
      undefined,
      [],
    );

    expect(result.isOk()).toBe(true);
    expect(mockUserAddToken).toHaveBeenCalledWith({
      token_id: {
        IC: { ledger_id: Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai") },
      },
      index_id: [],
      is_rune: [],
      rune_info: [],
    });
  });
});

describe("TokenStorageService.createRuneExportBridgeTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("it_should_create_rune_export_bridge_transaction", async () => {
    // Arrange
    const dto = fixture_of_bridge_transaction_dto({
      bridge_id: "export_rune_123",
      bridge_type: { Export: null },
      asset_infos: [
        {
          asset_type: { Runes: null },
          asset_id: "UNCOMMON•GOODS",
          amount: 1_200n,
          decimals: 8,
        },
      ],
      status: { Created: null },
      total_amount: [1_200n],
      ckbtc_block_id: [],
      deposit_fee: [],
      withdrawal_fee: [],
      btc_fee: [],
    });
    mockUserCreateBridgeTransaction.mockResolvedValue({ Ok: dto });
    mockBuildActor.mockReturnValue({
      user_create_bridge_transaction: mockUserCreateBridgeTransaction,
    });
    const { tokenStorageService } =
      await import("$modules/token/services/tokenStorage");

    // Act
    const result = await tokenStorageService.createRuneExportBridgeTransaction({
      receiverBtcAddress: "tb1qreceiver",
      runeId: "UNCOMMON•GOODS",
      amount: 1_200n,
      decimals: 8,
    });

    // Assert
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().bridge_type).toBe("Export");
    expect(result.unwrap().status).toBe("Created");

    const callArgs = mockUserCreateBridgeTransaction.mock.calls[0][0];
    expect(callArgs.bridge_type).toEqual({ Export: null });
    expect(callArgs.asset_infos).toEqual([
      {
        asset_type: { Runes: null },
        asset_id: "UNCOMMON•GOODS",
        amount: 1_200n,
        decimals: 8,
      },
    ]);
    expect(callArgs.status).toEqual([{ Created: null }]);
    expect(callArgs.withdrawal_fee).toEqual([]);
    expect(callArgs.btc_fee).toEqual([]);
  });
});

describe("TokenStorageService.getBridgeTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should omit optional filters when not provided", async () => {
    mockUserGetBridgeTransactions.mockResolvedValue([]);
    mockBuildActor.mockReturnValue({
      user_get_bridge_transactions: mockUserGetBridgeTransactions,
    });

    const { tokenStorageService } =
      await import("$modules/token/services/tokenStorage");

    await tokenStorageService.getBridgeTransactions(0, 10);

    expect(mockUserGetBridgeTransactions).toHaveBeenCalledWith({
      start: [0],
      limit: [10],
      status: [],
      bridge_type: [],
      asset_type: [],
      rune_id: [],
    });
  });

  it("should send rune asset type filter", async () => {
    mockUserGetBridgeTransactions.mockResolvedValue([]);
    mockBuildActor.mockReturnValue({
      user_get_bridge_transactions: mockUserGetBridgeTransactions,
    });

    const { tokenStorageService } =
      await import("$modules/token/services/tokenStorage");
    const { BridgeAssetType } =
      await import("$modules/bitcoin/types/bridge_transaction");

    await tokenStorageService.getBridgeTransactions(
      0,
      10,
      null,
      null,
      BridgeAssetType.Runes,
    );

    expect(mockUserGetBridgeTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        asset_type: [{ Runes: null }],
        rune_id: [],
      }),
    );
  });

  it("should send rune_id filter", async () => {
    mockUserGetBridgeTransactions.mockResolvedValue([]);
    mockBuildActor.mockReturnValue({
      user_get_bridge_transactions: mockUserGetBridgeTransactions,
    });

    const { tokenStorageService } =
      await import("$modules/token/services/tokenStorage");

    await tokenStorageService.getBridgeTransactions(
      0,
      10,
      null,
      null,
      null,
      "UNCOMMON•GOODS",
    );

    expect(mockUserGetBridgeTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        asset_type: [],
        rune_id: ["UNCOMMON•GOODS"],
      }),
    );
  });

  it("should send combined bridge_type, asset_type, and rune_id filters", async () => {
    mockUserGetBridgeTransactions.mockResolvedValue([]);
    mockBuildActor.mockReturnValue({
      user_get_bridge_transactions: mockUserGetBridgeTransactions,
    });

    const { tokenStorageService } =
      await import("$modules/token/services/tokenStorage");
    const { BridgeAssetType, BridgeType } =
      await import("$modules/bitcoin/types/bridge_transaction");

    await tokenStorageService.getBridgeTransactions(
      20,
      10,
      null,
      BridgeType.Import,
      BridgeAssetType.Runes,
      "UNCOMMON•GOODS",
    );

    expect(mockUserGetBridgeTransactions).toHaveBeenCalledWith({
      start: [20],
      limit: [10],
      status: [],
      bridge_type: [{ Import: null }],
      asset_type: [{ Runes: null }],
      rune_id: ["UNCOMMON•GOODS"],
    });
  });
});
