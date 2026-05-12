/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Principal } from "@icp-sdk/core/principal";

// Hoisted mock functions
const { mockBuildActor, mockUserCreateBridgeTransaction } = vi.hoisted(() => ({
  mockBuildActor: vi.fn(),
  mockUserCreateBridgeTransaction: vi.fn(),
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
    const { tokenStorageService } = await import(
      "$modules/token/services/tokenStorage"
    );

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
    const { tokenStorageService } = await import(
      "$modules/token/services/tokenStorage"
    );

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
  });

  it("it_should_fail_create_manual_import_bridge_due_to_canister_error", async () => {
    // Arrange
    mockUserCreateBridgeTransaction.mockResolvedValue({
      Err: { ValidationErrors: "ckbtc_block_id already exists" },
    });
    mockBuildActor.mockReturnValue({
      user_create_bridge_transaction: mockUserCreateBridgeTransaction,
    });
    const { tokenStorageService } = await import(
      "$modules/token/services/tokenStorage"
    );

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
