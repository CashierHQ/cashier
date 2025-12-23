import { Principal } from "@dfinity/principal";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TokenIndexService } from "./tokenIndexService";
import { TransactionKind } from "../types";

// Mock dependencies
vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    buildAnonymousAgent: vi.fn(() => ({})),
  },
}));

vi.mock("../constants", () => ({
  ICP_INDEX_CANISTER_ID: "qhbym-qaaaa-aaaaa-aaafq-cai",
}));

// Mock IndexCanister
const mockIcpGetTransactions = vi.fn();
vi.mock("@dfinity/ledger-icp", () => ({
  IndexCanister: {
    create: vi.fn(() => ({
      getTransactions: mockIcpGetTransactions,
    })),
  },
  AccountIdentifier: {
    fromPrincipal: vi.fn(() => ({
      toHex: vi.fn(() => "mock-account-identifier-hex"),
    })),
  },
  SubAccount: {
    fromBytes: vi.fn(() => ({})),
  },
}));

// Mock IcrcIndexNgCanister
const mockIcrcGetTransactions = vi.fn();
vi.mock("@dfinity/ledger-icrc", () => ({
  IcrcIndexNgCanister: {
    create: vi.fn(() => ({
      getTransactions: mockIcrcGetTransactions,
    })),
  },
}));

describe("TokenIndexService", () => {
  const ICP_INDEX_CANISTER_ID = "qhbym-qaaaa-aaaaa-aaafq-cai";
  const ICRC_INDEX_CANISTER_ID = "mxzaz-hqaaa-aaaar-qaada-cai";
  const USER_PRINCIPAL = "aaaaa-aa";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ICP transactions", () => {
    const service = new TokenIndexService(
      Principal.fromText(ICP_INDEX_CANISTER_ID),
    );

    it("should map ICP Transfer transaction correctly", async () => {
      // Arrange
      const timestampNanos = 1703001600000000000n; // 2023-12-19 16:00:00 UTC in nanos
      mockIcpGetTransactions.mockResolvedValue({
        transactions: [
          {
            id: 1n,
            transaction: {
              operation: {
                Transfer: {
                  to: "to-account",
                  fee: { e8s: 10000n },
                  from: "from-account",
                  amount: { e8s: 100000000n },
                  spender: [],
                },
              },
              timestamp: [{ timestamp_nanos: timestampNanos }],
              created_at_time: [],
              memo: 0n,
              icrc1_memo: [],
            },
          },
        ],
        balance: 500000000n,
        oldest_tx_id: [0n],
      });

      // Act
      const result = await service.getTransactions({
        account: { owner: USER_PRINCIPAL },
      });

      // Assert
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]).toMatchObject({
        id: 1n,
        kind: TransactionKind.TRANSFER,
        amount: 100000000n,
        fee: 10000n,
        timestampMs: 1703001600000,
        from: "from-account",
        to: "to-account",
        spender: undefined,
      });
      expect(result.balance).toBe(500000000n);
    });

    it("should map ICP Transfer with spender (transferFrom)", async () => {
      // Arrange
      mockIcpGetTransactions.mockResolvedValue({
        transactions: [
          {
            id: 2n,
            transaction: {
              operation: {
                Transfer: {
                  to: "to-account",
                  fee: { e8s: 10000n },
                  from: "from-account",
                  amount: { e8s: 50000000n },
                  spender: ["spender-account"],
                },
              },
              timestamp: [{ timestamp_nanos: 1703001600000000000n }],
              created_at_time: [],
              memo: 0n,
              icrc1_memo: [],
            },
          },
        ],
        balance: 450000000n,
        oldest_tx_id: [],
      });

      // Act
      const result = await service.getTransactions({
        account: { owner: USER_PRINCIPAL },
      });

      // Assert
      expect(result.transactions[0]).toMatchObject({
        kind: TransactionKind.TRANSFER,
        spender: "spender-account",
      });
    });

    it("should map ICP Mint transaction correctly", async () => {
      // Arrange
      mockIcpGetTransactions.mockResolvedValue({
        transactions: [
          {
            id: 3n,
            transaction: {
              operation: {
                Mint: {
                  to: "to-account",
                  amount: { e8s: 200000000n },
                },
              },
              timestamp: [],
              created_at_time: [{ timestamp_nanos: 1703001600000000000n }],
              memo: 0n,
              icrc1_memo: [],
            },
          },
        ],
        balance: 700000000n,
        oldest_tx_id: [],
      });

      // Act
      const result = await service.getTransactions({
        account: { owner: USER_PRINCIPAL },
      });

      // Assert
      expect(result.transactions[0]).toMatchObject({
        id: 3n,
        kind: TransactionKind.MINT,
        amount: 200000000n,
        to: "to-account",
        from: undefined,
      });
    });

    it("should map ICP Burn transaction with spender", async () => {
      // Arrange
      mockIcpGetTransactions.mockResolvedValue({
        transactions: [
          {
            id: 4n,
            transaction: {
              operation: {
                Burn: {
                  from: "from-account",
                  amount: { e8s: 30000000n },
                  spender: ["burn-spender"],
                },
              },
              timestamp: [{ timestamp_nanos: 1703001600000000000n }],
              created_at_time: [],
              memo: 0n,
              icrc1_memo: [],
            },
          },
        ],
        balance: 170000000n,
        oldest_tx_id: [],
      });

      // Act
      const result = await service.getTransactions({
        account: { owner: USER_PRINCIPAL },
      });

      // Assert
      expect(result.transactions[0]).toMatchObject({
        id: 4n,
        kind: TransactionKind.BURN,
        amount: 30000000n,
        from: "from-account",
        spender: "burn-spender",
      });
    });

    it("should map ICP Approve transaction correctly", async () => {
      // Arrange
      mockIcpGetTransactions.mockResolvedValue({
        transactions: [
          {
            id: 5n,
            transaction: {
              operation: {
                Approve: {
                  from: "from-account",
                  fee: { e8s: 10000n },
                  allowance: { e8s: 1000000000n },
                  expected_allowance: [],
                  expires_at: [],
                  spender: "approved-spender",
                },
              },
              timestamp: [{ timestamp_nanos: 1703001600000000000n }],
              created_at_time: [],
              memo: 0n,
              icrc1_memo: [],
            },
          },
        ],
        balance: 500000000n,
        oldest_tx_id: [],
      });

      // Act
      const result = await service.getTransactions({
        account: { owner: USER_PRINCIPAL },
      });

      // Assert
      expect(result.transactions[0]).toMatchObject({
        id: 5n,
        kind: TransactionKind.APPROVE,
        amount: 1000000000n,
        fee: 10000n,
        from: "from-account",
      });
    });

    it("should use created_at_time as fallback when timestamp is empty", async () => {
      // Arrange
      const createdAtNanos = 1703088000000000000n; // Different timestamp
      mockIcpGetTransactions.mockResolvedValue({
        transactions: [
          {
            id: 6n,
            transaction: {
              operation: {
                Transfer: {
                  to: "to-account",
                  fee: { e8s: 10000n },
                  from: "from-account",
                  amount: { e8s: 100000000n },
                  spender: [],
                },
              },
              timestamp: [],
              created_at_time: [{ timestamp_nanos: createdAtNanos }],
              memo: 0n,
              icrc1_memo: [],
            },
          },
        ],
        balance: 400000000n,
        oldest_tx_id: [],
      });

      // Act
      const result = await service.getTransactions({
        account: { owner: USER_PRINCIPAL },
      });

      // Assert
      expect(result.transactions[0].timestampMs).toBe(1703088000000);
    });

    it("should return 0 for timestampMs when both timestamp fields are empty", async () => {
      // Arrange
      mockIcpGetTransactions.mockResolvedValue({
        transactions: [
          {
            id: 7n,
            transaction: {
              operation: {
                Transfer: {
                  to: "to-account",
                  fee: { e8s: 10000n },
                  from: "from-account",
                  amount: { e8s: 100000000n },
                  spender: [],
                },
              },
              timestamp: [],
              created_at_time: [],
              memo: 0n,
              icrc1_memo: [],
            },
          },
        ],
        balance: 300000000n,
        oldest_tx_id: [],
      });

      // Act
      const result = await service.getTransactions({
        account: { owner: USER_PRINCIPAL },
      });

      // Assert
      expect(result.transactions[0].timestampMs).toBe(0);
    });
  });

  describe("ICRC transactions", () => {
    const service = new TokenIndexService(
      Principal.fromText(ICRC_INDEX_CANISTER_ID),
    );

    const mockPrincipal = Principal.fromText("aaaaa-aa");

    it("should map ICRC transfer transaction correctly", async () => {
      // Arrange
      const timestampNanos = 1703001600000000000n;
      mockIcrcGetTransactions.mockResolvedValue({
        transactions: [
          {
            id: 1n,
            transaction: {
              kind: "transfer",
              timestamp: timestampNanos,
              transfer: [
                {
                  to: { owner: mockPrincipal, subaccount: [] },
                  fee: [10000n],
                  from: { owner: mockPrincipal, subaccount: [] },
                  amount: 100000000n,
                  spender: [],
                  memo: [],
                  created_at_time: [],
                },
              ],
              mint: [],
              burn: [],
              approve: [],
            },
          },
        ],
        balance: 500000000n,
        oldest_tx_id: [0n],
      });

      // Act
      const result = await service.getTransactions({
        account: { owner: USER_PRINCIPAL },
      });

      // Assert
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]).toMatchObject({
        id: 1n,
        kind: "transfer",
        amount: 100000000n,
        fee: 10000n,
        timestampMs: 1703001600000,
      });
    });

    it("should map ICRC transfer with spender (transferFrom)", async () => {
      // Arrange
      const spenderPrincipal = Principal.fromText("2vxsx-fae");
      mockIcrcGetTransactions.mockResolvedValue({
        transactions: [
          {
            id: 2n,
            transaction: {
              kind: "transfer",
              timestamp: 1703001600000000000n,
              transfer: [
                {
                  to: { owner: mockPrincipal, subaccount: [] },
                  fee: [10000n],
                  from: { owner: mockPrincipal, subaccount: [] },
                  amount: 50000000n,
                  spender: [{ owner: spenderPrincipal, subaccount: [] }],
                  memo: [],
                  created_at_time: [],
                },
              ],
              mint: [],
              burn: [],
              approve: [],
            },
          },
        ],
        balance: 450000000n,
        oldest_tx_id: [],
      });

      // Act
      const result = await service.getTransactions({
        account: { owner: USER_PRINCIPAL },
      });

      // Assert
      expect(result.transactions[0].spender).toBe(spenderPrincipal.toText());
    });

    it("should map ICRC mint transaction correctly", async () => {
      // Arrange
      mockIcrcGetTransactions.mockResolvedValue({
        transactions: [
          {
            id: 3n,
            transaction: {
              kind: "mint",
              timestamp: 1703001600000000000n,
              transfer: [],
              mint: [
                {
                  to: { owner: mockPrincipal, subaccount: [] },
                  amount: 200000000n,
                  memo: [],
                  created_at_time: [],
                },
              ],
              burn: [],
              approve: [],
            },
          },
        ],
        balance: 700000000n,
        oldest_tx_id: [],
      });

      // Act
      const result = await service.getTransactions({
        account: { owner: USER_PRINCIPAL },
      });

      // Assert
      expect(result.transactions[0]).toMatchObject({
        id: 3n,
        kind: "mint",
        amount: 200000000n,
        to: mockPrincipal.toText(),
        from: undefined,
      });
    });

    it("should map ICRC burn transaction correctly", async () => {
      // Arrange
      mockIcrcGetTransactions.mockResolvedValue({
        transactions: [
          {
            id: 4n,
            transaction: {
              kind: "burn",
              timestamp: 1703001600000000000n,
              transfer: [],
              mint: [],
              burn: [
                {
                  from: { owner: mockPrincipal, subaccount: [] },
                  amount: 30000000n,
                  memo: [],
                  created_at_time: [],
                  spender: [],
                },
              ],
              approve: [],
            },
          },
        ],
        balance: 170000000n,
        oldest_tx_id: [],
      });

      // Act
      const result = await service.getTransactions({
        account: { owner: USER_PRINCIPAL },
      });

      // Assert
      expect(result.transactions[0]).toMatchObject({
        id: 4n,
        kind: "burn",
        amount: 30000000n,
        from: mockPrincipal.toText(),
      });
    });

    it("should map ICRC approve transaction correctly", async () => {
      // Arrange
      mockIcrcGetTransactions.mockResolvedValue({
        transactions: [
          {
            id: 5n,
            transaction: {
              kind: "approve",
              timestamp: 1703001600000000000n,
              transfer: [],
              mint: [],
              burn: [],
              approve: [
                {
                  from: { owner: mockPrincipal, subaccount: [] },
                  amount: 1000000000n,
                  fee: [10000n],
                  memo: [],
                  created_at_time: [],
                  expected_allowance: [],
                  expires_at: [],
                  spender: { owner: mockPrincipal, subaccount: [] },
                },
              ],
            },
          },
        ],
        balance: 500000000n,
        oldest_tx_id: [],
      });

      // Act
      const result = await service.getTransactions({
        account: { owner: USER_PRINCIPAL },
      });

      // Assert
      expect(result.transactions[0]).toMatchObject({
        id: 5n,
        kind: "approve",
        amount: 1000000000n,
        fee: 10000n,
        from: mockPrincipal.toText(),
      });
    });

    it("should use created_at_time from operation when available", async () => {
      // Arrange
      const operationCreatedAt = 1703088000000000000n;
      const txTimestamp = 1703001600000000000n;
      mockIcrcGetTransactions.mockResolvedValue({
        transactions: [
          {
            id: 6n,
            transaction: {
              kind: "transfer",
              timestamp: txTimestamp,
              transfer: [
                {
                  to: { owner: mockPrincipal, subaccount: [] },
                  fee: [10000n],
                  from: { owner: mockPrincipal, subaccount: [] },
                  amount: 100000000n,
                  spender: [],
                  memo: [],
                  created_at_time: [operationCreatedAt],
                },
              ],
              mint: [],
              burn: [],
              approve: [],
            },
          },
        ],
        balance: 400000000n,
        oldest_tx_id: [],
      });

      // Act
      const result = await service.getTransactions({
        account: { owner: USER_PRINCIPAL },
      });

      // Assert
      expect(result.transactions[0].timestampMs).toBe(1703088000000);
    });

    it("should fallback to transaction.timestamp when created_at_time is empty", async () => {
      // Arrange
      const txTimestamp = 1703001600000000000n;
      mockIcrcGetTransactions.mockResolvedValue({
        transactions: [
          {
            id: 7n,
            transaction: {
              kind: "transfer",
              timestamp: txTimestamp,
              transfer: [
                {
                  to: { owner: mockPrincipal, subaccount: [] },
                  fee: [10000n],
                  from: { owner: mockPrincipal, subaccount: [] },
                  amount: 100000000n,
                  spender: [],
                  memo: [],
                  created_at_time: [],
                },
              ],
              mint: [],
              burn: [],
              approve: [],
            },
          },
        ],
        balance: 300000000n,
        oldest_tx_id: [],
      });

      // Act
      const result = await service.getTransactions({
        account: { owner: USER_PRINCIPAL },
      });

      // Assert
      expect(result.transactions[0].timestampMs).toBe(1703001600000);
    });
  });

  describe("routing", () => {
    it("should route to ICP canister for ICP index canister ID", async () => {
      // Arrange
      const service = new TokenIndexService(
        Principal.fromText(ICP_INDEX_CANISTER_ID),
      );
      mockIcpGetTransactions.mockResolvedValue({
        transactions: [],
        balance: 0n,
        oldest_tx_id: [],
      });

      // Act
      await service.getTransactions({ account: { owner: USER_PRINCIPAL } });

      // Assert
      expect(mockIcpGetTransactions).toHaveBeenCalled();
      expect(mockIcrcGetTransactions).not.toHaveBeenCalled();
    });

    it("should route to ICRC canister for non-ICP index canister ID", async () => {
      // Arrange
      const service = new TokenIndexService(
        Principal.fromText(ICRC_INDEX_CANISTER_ID),
      );
      mockIcrcGetTransactions.mockResolvedValue({
        transactions: [],
        balance: 0n,
        oldest_tx_id: [],
      });

      // Act
      await service.getTransactions({ account: { owner: USER_PRINCIPAL } });

      // Assert
      expect(mockIcrcGetTransactions).toHaveBeenCalled();
      expect(mockIcpGetTransactions).not.toHaveBeenCalled();
    });
  });

  describe("pagination", () => {
    it("should use default page size when maxResults not specified", async () => {
      // Arrange
      const service = new TokenIndexService(
        Principal.fromText(ICRC_INDEX_CANISTER_ID),
      );
      mockIcrcGetTransactions.mockResolvedValue({
        transactions: [],
        balance: 0n,
        oldest_tx_id: [],
      });

      // Act
      await service.getTransactions({ account: { owner: USER_PRINCIPAL } });

      // Assert
      expect(mockIcrcGetTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          max_results: 100n,
        }),
      );
    });

    it("should use custom maxResults when specified", async () => {
      // Arrange
      const service = new TokenIndexService(
        Principal.fromText(ICRC_INDEX_CANISTER_ID),
      );
      mockIcrcGetTransactions.mockResolvedValue({
        transactions: [],
        balance: 0n,
        oldest_tx_id: [],
      });

      // Act
      await service.getTransactions({
        account: { owner: USER_PRINCIPAL },
        maxResults: 50n,
      });

      // Assert
      expect(mockIcrcGetTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          max_results: 50n,
        }),
      );
    });
  });
});
