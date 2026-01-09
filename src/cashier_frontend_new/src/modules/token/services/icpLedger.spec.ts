/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Principal } from "@dfinity/principal";

// Hoisted mock functions for vi.mock factory
const { mockBuildActor, mockIcrc1BalanceOf, mockTransfer, mockIcrc1Transfer } =
  vi.hoisted(() => ({
    mockBuildActor: vi.fn(),
    mockIcrc1BalanceOf: vi.fn(),
    mockTransfer: vi.fn(),
    mockIcrc1Transfer: vi.fn(),
  }));

// Mock auth state
vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    account: { owner: "aaaaa-aa", subaccount: null },
    buildActor: mockBuildActor,
  },
}));

// Mock constants
vi.mock("../constants", () => ({
  ICP_LEDGER_CANISTER_ID: "ryjl3-tyaaa-aaaaa-aaaba-cai",
  ICP_LEDGER_FEE: 10_000n,
}));

// Mock decodeAccountID
vi.mock("$modules/shared/utils/icp-account-id", () => ({
  decodeAccountID: vi.fn(() => new Uint8Array([1, 2, 3, 4])),
}));

// Import after mocks
import { authState } from "$modules/auth/state/auth.svelte";
import { IcpLedgerService } from "./icpLedger";
import { decodeAccountID } from "$modules/shared/utils/icp-account-id";

describe("IcpLedgerService", () => {
  let service: IcpLedgerService;

  // Mock actor with ledger methods
  const mockActor = {
    icrc1_balance_of: mockIcrc1BalanceOf,
    transfer: mockTransfer,
    icrc1_transfer: mockIcrc1Transfer,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset authState.account for each test
    vi.mocked(authState).account = {
      owner: "aaaaa-aa",
      subaccount: null,
    } as typeof authState.account;
    service = new IcpLedgerService();
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
    it("should create instance with default ICP ledger canister", () => {
      const svc = new IcpLedgerService();
      expect(svc).toBeInstanceOf(IcpLedgerService);
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
        canisterId: "ryjl3-tyaaa-aaaaa-aaaba-cai",
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
      mockBuildActor.mockReturnValue(mockActor);

      await expect(service.getBalance()).rejects.toThrow(
        "User is not authenticated",
      );
    });

    it("should return zero balance", async () => {
      mockIcrc1BalanceOf.mockResolvedValue(0n);

      const balance = await service.getBalance();

      expect(balance).toBe(0n);
    });

    it("should return large balance correctly", async () => {
      const largeBalance = 100_000_000_000_000n;
      mockIcrc1BalanceOf.mockResolvedValue(largeBalance);

      const balance = await service.getBalance();

      expect(balance).toBe(largeBalance);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // transferToAccount()
  // ─────────────────────────────────────────────────────────────

  describe("transferToAccount", () => {
    const accountIdHex = "abc123def456";
    const amount = 1_000_000n;

    beforeEach(() => {
      // Reset authState.account for each test
      vi.mocked(authState).account = {
        owner: "aaaaa-aa",
        subaccount: null,
      } as typeof authState.account;
    });

    it("should transfer successfully and return block height", async () => {
      const blockHeight = 12345n;
      mockTransfer.mockResolvedValue({ Ok: blockHeight });

      const result = await service.transferToAccount(accountIdHex, amount);

      expect(decodeAccountID).toHaveBeenCalledWith(accountIdHex);
      expect(mockTransfer).toHaveBeenCalledWith({
        to: new Uint8Array([1, 2, 3, 4]),
        amount: { e8s: amount },
        fee: { e8s: 10_000n },
        memo: 0n,
        from_subaccount: [],
        created_at_time: [],
      });
      expect(result).toBe(blockHeight);
    });

    it("should throw when actor is null (not authenticated)", async () => {
      mockBuildActor.mockReturnValue(null);

      await expect(
        service.transferToAccount(accountIdHex, amount),
      ).rejects.toThrow("User is not authenticated");
    });

    it("should throw on TxTooOld error", async () => {
      mockTransfer.mockResolvedValue({
        Err: { TxTooOld: { allowed_window_nanos: 1000n } },
      });

      await expect(
        service.transferToAccount(accountIdHex, amount),
      ).rejects.toThrow("Transaction too old:");
    });

    it("should throw on BadFee error", async () => {
      mockTransfer.mockResolvedValue({
        Err: { BadFee: { expected_fee: { e8s: 20_000n } } },
      });

      await expect(
        service.transferToAccount(accountIdHex, amount),
      ).rejects.toThrow("Bad fee:");
    });

    it("should throw on TxDuplicate error", async () => {
      mockTransfer.mockResolvedValue({
        Err: { TxDuplicate: { duplicate_of: 100n } },
      });

      await expect(
        service.transferToAccount(accountIdHex, amount),
      ).rejects.toThrow("Duplicate transaction:");
    });

    it("should throw on InsufficientFunds error", async () => {
      mockTransfer.mockResolvedValue({
        Err: { InsufficientFunds: { balance: { e8s: 500n } } },
      });

      await expect(
        service.transferToAccount(accountIdHex, amount),
      ).rejects.toThrow("Insufficient funds");
    });

    it("should throw on TxCreatedInFuture error", async () => {
      mockTransfer.mockResolvedValue({ Err: { TxCreatedInFuture: null } });

      await expect(
        service.transferToAccount(accountIdHex, amount),
      ).rejects.toThrow("Transaction created in future");
    });

    it("should handle zero amount transfer", async () => {
      const blockHeight = 99n;
      mockTransfer.mockResolvedValue({ Ok: blockHeight });

      const result = await service.transferToAccount(accountIdHex, 0n);

      expect(mockTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: { e8s: 0n },
        }),
      );
      expect(result).toBe(blockHeight);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // transferToPrincipal()
  // ─────────────────────────────────────────────────────────────

  describe("transferToPrincipal", () => {
    const toPrincipal = Principal.fromText("aaaaa-aa");
    const amount = 2_000_000n;

    beforeEach(() => {
      vi.mocked(authState).account = {
        owner: "aaaaa-aa",
        subaccount: null,
      } as typeof authState.account;
    });

    it("should transfer successfully via ICRC-1 and return block index", async () => {
      const blockIndex = 67890n;
      mockIcrc1Transfer.mockResolvedValue({ Ok: blockIndex });

      const result = await service.transferToPrincipal(toPrincipal, amount);

      expect(mockIcrc1Transfer).toHaveBeenCalledWith({
        to: { owner: toPrincipal, subaccount: [] },
        amount,
        fee: [10_000n],
        memo: [],
        from_subaccount: [],
        created_at_time: [],
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

    it("should throw on Duplicate error", async () => {
      mockIcrc1Transfer.mockResolvedValue({
        Err: { Duplicate: { duplicate_of: 42n } },
      });

      await expect(
        service.transferToPrincipal(toPrincipal, amount),
      ).rejects.toThrow("Duplicate transaction:");
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
      ).rejects.toThrow("Transaction is too old:");
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

    it("should handle large amount transfer", async () => {
      const largeAmount = 1_000_000_000_000n;
      const blockIndex = 999999n;
      mockIcrc1Transfer.mockResolvedValue({ Ok: blockIndex });

      const result = await service.transferToPrincipal(
        toPrincipal,
        largeAmount,
      );

      expect(mockIcrc1Transfer).toHaveBeenCalledWith(
        expect.objectContaining({ amount: largeAmount }),
      );
      expect(result).toBe(blockIndex);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // icpLedgerService singleton
  // ─────────────────────────────────────────────────────────────

  describe("icpLedgerService singleton", () => {
    it("should export a singleton instance", async () => {
      const { icpLedgerService } = await import("./icpLedger");
      expect(icpLedgerService).toBeInstanceOf(IcpLedgerService);
    });
  });
});
