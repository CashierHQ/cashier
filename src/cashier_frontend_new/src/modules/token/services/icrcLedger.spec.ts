/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Principal } from "@dfinity/principal";

// Hoisted mock functions for vi.mock factory
const { mockBuildActor, mockIcrc1BalanceOf, mockIcrc1Transfer } = vi.hoisted(
  () => ({
    mockBuildActor: vi.fn(),
    mockIcrc1BalanceOf: vi.fn(),
    mockIcrc1Transfer: vi.fn(),
  }),
);

// Mock auth state
vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    account: { owner: "aaaaa-aa", subaccount: null },
    buildActor: mockBuildActor,
  },
}));

// Import after mocks
import { authState } from "$modules/auth/state/auth.svelte";
import { IcrcLedgerService } from "./icrcLedger";
import type { TokenMetadata } from "../types";

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
});
