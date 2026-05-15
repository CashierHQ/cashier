/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Principal } from "@icp-sdk/core/principal";

// Hoisted mock functions for vi.mock factory
const {
  mockBuildActor,
  mockIcrc1BalanceOf,
  mockIcrc1Transfer,
  mockIcrc2Approve,
  mockIcrc2Allowance,
} = vi.hoisted(() => ({
  mockBuildActor: vi.fn(),
  mockIcrc1BalanceOf: vi.fn(),
  mockIcrc1Transfer: vi.fn(),
  mockIcrc2Approve: vi.fn(),
  mockIcrc2Allowance: vi.fn(),
}));

// Mock auth state
vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    account: { owner: "aaaaa-aa", subaccount: null },
    buildActor: mockBuildActor,
  },
}));

vi.mock("$modules/bitcoin/constants", () => ({
  CKBTC_MINTER_CANISTER_ID: "ml52i-qqaaa-aaaar-qaaba-cai",
}));

// Import after mocks
import { authState } from "$modules/auth/state/auth.svelte";
import { CKBTC_MINTER_CANISTER_ID } from "$modules/bitcoin/constants";
import { IcrcLedgerService } from "$modules/token/services/icrcLedger";
import type { TokenMetadata } from "$modules/token/types";

describe("IcrcLedgerService", () => {
  let service: IcrcLedgerService;
  const mockToken: TokenMetadata = {
    address: "mxzaz-hqaaa-aaaar-qaada-cai",
    name: "Test Token",
    symbol: "TEST",
    decimals: 8,
    fee: 10_000n,
    enabled: true,
    is_default: false,
  };

  // Mock actor with ledger methods
  const mockActor = {
    icrc1_balance_of: mockIcrc1BalanceOf,
    icrc1_transfer: mockIcrc1Transfer,
    icrc2_approve: mockIcrc2Approve,
    icrc2_allowance: mockIcrc2Allowance,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset authState.account for each test
    vi.mocked(authState).account = {
      owner: "aaaaa-aa",
      subaccount: null,
    } as typeof authState.account;
    service = new IcrcLedgerService(mockToken);
    // Default: actor is available
    mockBuildActor.mockReturnValue(mockActor);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // constructor
  // ─────────────────────────────────────────────────────────────

  describe("constructor", () => {
    it("should create instance with token metadata", () => {
      const svc = new IcrcLedgerService(mockToken);
      expect(svc).toBeInstanceOf(IcrcLedgerService);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getBalance()
  // ─────────────────────────────────────────────────────────────

  describe("getBalance", () => {
    it("should return balance for authenticated user", async () => {
      const expectedBalance = 1_000_000_000n;
      mockIcrc1BalanceOf.mockResolvedValue(expectedBalance);

      const balance = await service.getBalance();

      expect(mockBuildActor).toHaveBeenCalledWith({
        canisterId: mockToken.address,
        idlFactory: expect.any(Function),
      });
      expect(mockIcrc1BalanceOf).toHaveBeenCalledWith({
        owner: Principal.fromText("aaaaa-aa"),
        subaccount: [],
      });
      expect(balance).toBe(expectedBalance);
    });

    it("should throw when actor is null (not authenticated)", async () => {
      mockBuildActor.mockReturnValue(null);

      await expect(service.getBalance()).rejects.toThrow(
        "User is not authenticated",
      );
    });

    it("should throw when account is null", async () => {
      vi.mocked(authState).account = null as typeof authState.account;

      await expect(service.getBalance()).rejects.toThrow(
        "User is not authenticated",
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // transferToPrincipal()
  // ─────────────────────────────────────────────────────────────

  describe("transferToPrincipal", () => {
    const toPrincipal = Principal.fromText("aaaaa-aa");
    const amount = 2_000_000n;

    it("should transfer successfully and return block index", async () => {
      const blockIndex = 67890n;
      mockIcrc1Transfer.mockResolvedValue({ Ok: blockIndex });

      const result = await service.transferToPrincipal(toPrincipal, amount);

      expect(mockIcrc1Transfer).toHaveBeenCalledWith({
        to: { owner: toPrincipal, subaccount: [] },
        amount,
        fee: [mockToken.fee],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
      });
      expect(result).toBe(blockIndex);
    });

    it("should transfer with deduplication memo and created_at_time", async () => {
      const blockIndex = 67890n;
      const memo = new Uint8Array([1, 2, 3]);
      const createdAtTime = 1_700_000_000_000_000_000n;
      mockIcrc1Transfer.mockResolvedValue({ Ok: blockIndex });

      const result = await service.transferToPrincipal(toPrincipal, amount, {
        memo,
        createdAtTime,
      });

      expect(mockIcrc1Transfer).toHaveBeenCalledWith({
        to: { owner: toPrincipal, subaccount: [] },
        amount,
        fee: [mockToken.fee],
        memo: [memo],
        from_subaccount: [],
        created_at_time: [createdAtTime],
      });
      expect(result).toBe(blockIndex);
    });

    it("should throw when actor is null (not authenticated)", async () => {
      mockBuildActor.mockReturnValue(null);

      await expect(
        service.transferToPrincipal(toPrincipal, amount),
      ).rejects.toThrow("User is not authenticated");
    });

    it("should throw on GenericError", async () => {
      mockIcrc1Transfer.mockResolvedValue({
        Err: { GenericError: { message: "Test error", error_code: 500n } },
      });

      await expect(
        service.transferToPrincipal(toPrincipal, amount),
      ).rejects.toThrow("Test error (code: 500)");
    });

    it("should throw on TemporarilyUnavailable error", async () => {
      mockIcrc1Transfer.mockResolvedValue({
        Err: { TemporarilyUnavailable: null },
      });

      await expect(
        service.transferToPrincipal(toPrincipal, amount),
      ).rejects.toThrow("Ledger is temporarily unavailable");
    });

    it("should throw on BadBurn error", async () => {
      mockIcrc1Transfer.mockResolvedValue({
        Err: { BadBurn: { min_burn_amount: 1000n } },
      });

      await expect(
        service.transferToPrincipal(toPrincipal, amount),
      ).rejects.toThrow("Bad burn amount:");
    });

    it("should return duplicate block index on Duplicate error", async () => {
      mockIcrc1Transfer.mockResolvedValue({
        Err: { Duplicate: { duplicate_of: 42n } },
      });

      await expect(
        service.transferToPrincipal(toPrincipal, amount),
      ).resolves.toBe(42n);
    });

    it("should throw on BadFee error", async () => {
      mockIcrc1Transfer.mockResolvedValue({
        Err: { BadFee: { expected_fee: 20_000n } },
      });

      await expect(
        service.transferToPrincipal(toPrincipal, amount),
      ).rejects.toThrow("Bad fee:");
    });

    it("should throw on TooOld error", async () => {
      mockIcrc1Transfer.mockResolvedValue({ Err: { TooOld: null } });

      await expect(
        service.transferToPrincipal(toPrincipal, amount),
      ).rejects.toThrow("Transaction is too old");
    });

    it("should throw on CreatedInFuture error", async () => {
      mockIcrc1Transfer.mockResolvedValue({
        Err: { CreatedInFuture: { ledger_time: 1000n } },
      });

      await expect(
        service.transferToPrincipal(toPrincipal, amount),
      ).rejects.toThrow("Created in future:");
    });

    it("should throw on InsufficientFunds error", async () => {
      mockIcrc1Transfer.mockResolvedValue({
        Err: { InsufficientFunds: { balance: 100n } },
      });

      await expect(
        service.transferToPrincipal(toPrincipal, amount),
      ).rejects.toThrow("Insufficient funds");
    });
  });

  describe("approveCkBtcWithdrawal", () => {
    it("should approve ckBTC withdrawal with deterministic memo and created_at_time", async () => {
      // Arrange
      const amount = 50_000n;
      const memo = new Uint8Array([1, 2, 3]);
      const createdAtTime = 1_700_000_000_000_000_000n;
      mockIcrc2Approve.mockResolvedValue({ Ok: 123n });

      // Act
      const result = await service.approveCkBtcWithdrawal(
        amount,
        memo,
        createdAtTime,
      );

      // Assert
      expect(result).toBe(123n);
      expect(mockIcrc2Approve).toHaveBeenCalledWith({
        spender: {
          owner: Principal.fromText(CKBTC_MINTER_CANISTER_ID),
          subaccount: [],
        },
        amount,
        fee: [mockToken.fee],
        memo: [memo],
        created_at_time: [createdAtTime],
        expected_allowance: [],
        expires_at: [],
        from_subaccount: [],
      });
    });
  });

  describe("getAllowanceForCkBtcMinter", () => {
    it("should return allowance for ckBTC minter spender", async () => {
      // Arrange
      mockIcrc2Allowance.mockResolvedValue({
        allowance: 99_000n,
        expires_at: [],
      });

      // Act
      const result = await service.getAllowanceForCkBtcMinter();

      // Assert
      expect(result).toBe(99_000n);
      expect(mockIcrc2Allowance).toHaveBeenCalledWith({
        account: {
          owner: Principal.fromText("aaaaa-aa"),
          subaccount: [],
        },
        spender: {
          owner: Principal.fromText(CKBTC_MINTER_CANISTER_ID),
          subaccount: [],
        },
      });
    });
  });
});
