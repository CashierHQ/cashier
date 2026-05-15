import { describe, it, expect, vi, beforeEach } from "vitest";
import { Ok, Err } from "ts-results-es";
import type { Principal as PrincipalType } from "@dfinity/principal";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// All variables referenced inside vi.mock() factories must be hoisted to avoid
// Temporal Dead Zone errors (vi.mock() is hoisted to top of file by Vitest).

const {
  queryHolder,
  mockAuthHolder,
  mockListTokens,
  mockToggleToken,
  mockAddToken,
  mockIcpGetBalance,
  mockIcpTransferToAccount,
  mockIcrcGetBalance,
  mockIcrcTransferToPrincipal,
  mockEncodeAccountID,
  mockGetCachedTokenImage,
  mockSortWalletTokens,
  mockTokenPriceHolder,
} = vi.hoisted(() => ({
  queryHolder: {
    instance: null as {
      data: unknown;
      isLoading: boolean;
      refresh: ReturnType<typeof vi.fn>;
      reset: ReturnType<typeof vi.fn>;
      _invokeQueryFn: () => Promise<unknown>;
    } | null,
  },
  mockAuthHolder: {
    account: { owner: "test-owner" } as { owner: string } | null,
  },
  mockListTokens: vi.fn(),
  mockToggleToken: vi.fn(),
  mockAddToken: vi.fn(),
  mockIcpGetBalance: vi.fn(),
  mockIcpTransferToAccount: vi.fn(),
  mockIcrcGetBalance: vi.fn(),
  mockIcrcTransferToPrincipal: vi.fn(),
  mockEncodeAccountID: vi.fn(),
  mockGetCachedTokenImage: vi.fn(),
  mockSortWalletTokens: vi
    .fn()
    .mockImplementation((tokens: unknown[]) => tokens),
  mockTokenPriceHolder: {
    data: undefined as Record<string, number> | undefined,
  },
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("$lib/managedState", () => ({
  managedState: vi
    .fn()
    .mockImplementation((config: { queryFn: () => Promise<unknown> }) => {
      queryHolder.instance = {
        data: undefined,
        isLoading: false,
        refresh: vi.fn(),
        reset: vi.fn(),
        _invokeQueryFn: async () => {
          const result = await config.queryFn();
          queryHolder.instance!.data = result;
          return result;
        },
      };
      return queryHolder.instance;
    }),
}));

vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    get account() {
      return mockAuthHolder.account;
    },
  },
}));

vi.mock("$modules/token/services/tokenStorage", () => ({
  tokenStorageService: {
    listTokens: mockListTokens,
    toggleToken: mockToggleToken,
    addToken: mockAddToken,
  },
}));

vi.mock("$modules/token/services/icpLedger", () => ({
  icpLedgerService: {
    getBalance: mockIcpGetBalance,
    transferToAccount: mockIcpTransferToAccount,
  },
}));

vi.mock("$modules/token/services/icrcLedger", () => ({
  IcrcLedgerService: vi.fn().mockImplementation(() => ({
    getBalance: mockIcrcGetBalance,
    transferToPrincipal: mockIcrcTransferToPrincipal,
  })),
}));

vi.mock("../constants", () => ({
  ICP_LEDGER_CANISTER_ID: "ryjl3-tyaaa-aaaaa-aaaba-cai",
}));

vi.mock("./tokenPriceStore.svelte", () => ({
  tokenPriceStore: {
    get query() {
      return mockTokenPriceHolder;
    },
  },
}));

vi.mock("$modules/shared/utils/icpAccountId", () => ({
  encodeAccountID: mockEncodeAccountID,
}));

vi.mock("$modules/imageCache", () => ({
  getTokenLogo: vi.fn(),
  loadTokenImages: vi.fn(),
  getCachedTokenImage: mockGetCachedTokenImage,
}));

vi.mock("../utils/sorter", () => ({
  sortWalletTokens: mockSortWalletTokens,
}));

vi.mock("@dfinity/principal", () => ({
  Principal: {
    fromText: vi.fn().mockImplementation((text: string) => ({
      toString: () => text,
      toText: () => text,
    })),
  },
}));

// ── Import store after mocks ──────────────────────────────────────────────────

import { walletStore } from "./walletStore.svelte";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ICP_LEDGER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";

const makeToken = (address: string, enabled = true) => ({
  address,
  enabled,
  name: `Token-${address}`,
  symbol: "TKN",
  decimals: 8,
  fee: 0n,
  is_default: false,
  indexId: undefined,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("WalletStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryHolder.instance!.data = undefined;
    queryHolder.instance!.isLoading = false;
    mockAuthHolder.account = { owner: "test-owner" };
    mockTokenPriceHolder.data = undefined;
    // Restore sort passthrough after clearAllMocks wipes implementations
    mockSortWalletTokens.mockImplementation((tokens: unknown[]) => tokens);
  });

  // ── query getter ─────────────────────────────────────────────────────────────

  describe("query getter", () => {
    it("returns managedState instance", () => {
      // Arrange — store is a singleton initialized at module load

      // Act
      const query = walletStore.query;

      // Assert
      expect(query).toBe(queryHolder.instance!);
    });
  });

  // ── icpAccountID ─────────────────────────────────────────────────────────────

  describe("icpAccountID", () => {
    it("returns null when no auth account", () => {
      // Arrange
      mockAuthHolder.account = null;

      // Act
      const result = walletStore.icpAccountID();

      // Assert
      expect(result).toBeNull();
    });

    it("returns encoded ICP account ID when account exists", () => {
      // Arrange
      mockAuthHolder.account = { owner: "aaaaa-aa" };
      mockEncodeAccountID.mockReturnValueOnce("icp-account-id-abc123");

      // Act
      const result = walletStore.icpAccountID();

      // Assert
      expect(result).toBe("icp-account-id-abc123");
    });

    it("returns null when encodeAccountID throws", () => {
      // Arrange
      mockAuthHolder.account = { owner: "some-principal" };
      mockEncodeAccountID.mockImplementationOnce(() => {
        throw new Error("Encode failed");
      });

      // Act
      const result = walletStore.icpAccountID();

      // Assert
      expect(result).toBeNull();
    });
  });

  // ── findTokenByAddress ────────────────────────────────────────────────────────

  describe("findTokenByAddress", () => {
    it("returns Err when wallet data not loaded", () => {
      // Arrange
      queryHolder.instance!.data = undefined;

      // Act
      const result = walletStore.findTokenByAddress("some-token");

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain("not loaded");
    });

    it("returns Err for unknown token address", () => {
      // Arrange
      queryHolder.instance!.data = [makeToken("known-token")];

      // Act
      const result = walletStore.findTokenByAddress("unknown-token");

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().message).toContain("not found");
    });

    it("returns Ok with token data for known address", () => {
      // Arrange
      const token = makeToken("token-abc");
      queryHolder.instance!.data = [token];

      // Act
      const result = walletStore.findTokenByAddress("token-abc");

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().address).toBe("token-abc");
    });
  });

  // ── getTokenImage ────────────────────────────────────────────────────────────

  describe("getTokenImage", () => {
    it("returns null when image not cached", () => {
      // Arrange
      mockGetCachedTokenImage.mockReturnValueOnce(null);

      // Act
      const result = walletStore.getTokenImage("some-token");

      // Assert
      expect(result).toBeNull();
    });

    it("returns cached image URL when available", () => {
      // Arrange
      mockGetCachedTokenImage.mockReturnValueOnce("blob:abc123");

      // Act
      const result = walletStore.getTokenImage("some-token");

      // Assert
      expect(result).toBe("blob:abc123");
    });

    it("delegates to getCachedTokenImage with correct address", () => {
      // Arrange
      mockGetCachedTokenImage.mockReturnValueOnce(null);

      // Act
      walletStore.getTokenImage("token-xyz");

      // Assert
      expect(mockGetCachedTokenImage).toHaveBeenCalledWith("token-xyz");
    });
  });

  // ── toggleToken ──────────────────────────────────────────────────────────────

  describe("toggleToken", () => {
    it("calls tokenStorageService.toggleToken", async () => {
      // Arrange
      mockToggleToken.mockResolvedValueOnce(Ok(undefined));

      // Act
      await walletStore.toggleToken("token-abc", true);

      // Assert
      expect(mockToggleToken).toHaveBeenCalledTimes(1);
    });

    it("calls query.refresh after toggle", async () => {
      // Arrange
      mockToggleToken.mockResolvedValueOnce(Ok(undefined));

      // Act
      await walletStore.toggleToken("token-abc", false);

      // Assert
      expect(queryHolder.instance!.refresh).toHaveBeenCalledTimes(1);
    });

    it("returns result from tokenStorageService", async () => {
      // Arrange
      const expected = Ok(undefined);
      mockToggleToken.mockResolvedValueOnce(expected);

      // Act
      const result = await walletStore.toggleToken("token-abc", true);

      // Assert
      expect(result).toBe(expected);
    });
  });

  // ── addToken ─────────────────────────────────────────────────────────────────

  describe("addToken", () => {
    it("calls query.refresh when addToken succeeds", async () => {
      // Arrange
      queryHolder.instance!.data = [];
      mockAddToken.mockResolvedValueOnce(Ok(undefined));

      // Act
      await walletStore.addToken("new-token");

      // Assert
      expect(queryHolder.instance!.refresh).toHaveBeenCalledTimes(1);
    });

    it("does not call refresh when addToken fails", async () => {
      // Arrange
      queryHolder.instance!.data = [];
      mockAddToken.mockResolvedValueOnce(Err(new Error("duplicate")));

      // Act
      await walletStore.addToken("duplicate-token");

      // Assert
      expect(queryHolder.instance!.refresh).not.toHaveBeenCalled();
    });

    it("returns result from tokenStorageService", async () => {
      // Arrange
      queryHolder.instance!.data = [];
      const expected = Ok(undefined);
      mockAddToken.mockResolvedValueOnce(expected);

      // Act
      const result = await walletStore.addToken("new-token");

      // Assert
      expect(result).toBe(expected);
    });

    it("passes existing token addresses for duplicate check", async () => {
      // Arrange
      queryHolder.instance!.data = [makeToken("existing-token")];
      mockAddToken.mockResolvedValueOnce(Ok(undefined));

      // Act
      await walletStore.addToken("new-token");

      // Assert — third argument must contain existing token addresses
      expect(mockAddToken).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        ["existing-token"],
        undefined,
        undefined,
        undefined,
      );
    });
  });

  // ── transferTokenToPrincipal ──────────────────────────────────────────────────

  describe("transferTokenToPrincipal", () => {
    it("calls IcrcLedgerService.transferToPrincipal with correct args", async () => {
      // Arrange
      queryHolder.instance!.data = [makeToken("icrc-token")];
      mockIcrcTransferToPrincipal.mockResolvedValueOnce(Ok(1n));
      const recipient = {} as PrincipalType;

      // Act
      await walletStore.transferTokenToPrincipal(
        "icrc-token",
        recipient,
        1000n,
      );

      // Assert
      expect(mockIcrcTransferToPrincipal).toHaveBeenCalledWith(
        recipient,
        1000n,
        undefined,
      );
    });

    it("calls query.refresh after transfer", async () => {
      // Arrange
      queryHolder.instance!.data = [makeToken("icrc-token")];
      mockIcrcTransferToPrincipal.mockResolvedValueOnce(Ok(1n));

      // Act
      await walletStore.transferTokenToPrincipal(
        "icrc-token",
        {} as PrincipalType,
        100n,
      );

      // Assert
      expect(queryHolder.instance!.refresh).toHaveBeenCalledTimes(1);
    });

    it("returns result from IcrcLedgerService", async () => {
      // Arrange
      queryHolder.instance!.data = [makeToken("icrc-token")];
      const expected = Ok(42n);
      mockIcrcTransferToPrincipal.mockResolvedValueOnce(expected);

      // Act
      const result = await walletStore.transferTokenToPrincipal(
        "icrc-token",
        {} as PrincipalType,
        100n,
      );

      // Assert
      expect(result).toBe(expected);
    });
  });

  // ── transferICPToAccount ──────────────────────────────────────────────────────

  describe("transferICPToAccount", () => {
    it("calls icpLedgerService.transferToAccount with correct args", async () => {
      // Arrange
      mockIcpTransferToAccount.mockResolvedValueOnce(Ok(1n));

      // Act
      await walletStore.transferICPToAccount("icp-account-id", 500n);

      // Assert
      expect(mockIcpTransferToAccount).toHaveBeenCalledWith(
        "icp-account-id",
        500n,
      );
    });

    it("calls query.refresh after transfer", async () => {
      // Arrange
      mockIcpTransferToAccount.mockResolvedValueOnce(Ok(1n));

      // Act
      await walletStore.transferICPToAccount("icp-account-id", 500n);

      // Assert
      expect(queryHolder.instance!.refresh).toHaveBeenCalledTimes(1);
    });

    it("returns transfer result", async () => {
      // Arrange
      const expected = Ok(5n);
      mockIcpTransferToAccount.mockResolvedValueOnce(expected);

      // Act
      const result = await walletStore.transferICPToAccount(
        "icp-account-id",
        500n,
      );

      // Assert
      expect(result).toBe(expected);
    });
  });

  // ── queryFn — token enrichment ────────────────────────────────────────────────

  describe("queryFn — token enrichment", () => {
    it("uses ICP ledger for ICP token balance", async () => {
      // Arrange
      mockListTokens.mockResolvedValueOnce([makeToken(ICP_LEDGER_ID, true)]);
      mockIcpGetBalance.mockResolvedValueOnce(1000n);
      mockTokenPriceHolder.data = {};

      // Act
      await queryHolder.instance!._invokeQueryFn();

      // Assert
      expect(mockIcpGetBalance).toHaveBeenCalledTimes(1);
      expect(mockIcrcGetBalance).not.toHaveBeenCalled();
    });

    it("uses ICRC ledger for non-ICP token balance", async () => {
      // Arrange
      mockListTokens.mockResolvedValueOnce([makeToken("icrc-token-abc", true)]);
      mockIcrcGetBalance.mockResolvedValueOnce(500n);
      mockTokenPriceHolder.data = {};

      // Act
      await queryHolder.instance!._invokeQueryFn();

      // Assert
      expect(mockIcrcGetBalance).toHaveBeenCalledTimes(1);
      expect(mockIcpGetBalance).not.toHaveBeenCalled();
    });

    it("fetches balances only for enabled tokens", async () => {
      // Arrange
      mockListTokens.mockResolvedValueOnce([
        makeToken("enabled-token", true),
        makeToken("disabled-token", false),
      ]);
      mockIcrcGetBalance.mockResolvedValueOnce(100n);
      mockTokenPriceHolder.data = {};

      // Act
      await queryHolder.instance!._invokeQueryFn();

      // Assert — only 1 balance call; disabled token skipped
      expect(mockIcrcGetBalance).toHaveBeenCalledTimes(1);
    });

    it("falls back to 0n when balance fetch fails", async () => {
      // Arrange
      mockListTokens.mockResolvedValueOnce([makeToken("failing-token", true)]);
      mockIcrcGetBalance.mockRejectedValueOnce(new Error("Network error"));
      mockTokenPriceHolder.data = {};

      // Act
      const tokens = (await queryHolder.instance!._invokeQueryFn()) as Array<{
        balance: bigint;
      }>;

      // Assert
      expect(tokens[0].balance).toBe(0n);
    });

    it("merges price from tokenPriceStore into enriched tokens", async () => {
      // Arrange
      mockListTokens.mockResolvedValueOnce([makeToken("priced-token", true)]);
      mockIcrcGetBalance.mockResolvedValueOnce(100n);
      mockTokenPriceHolder.data = { "priced-token": 3.5 };

      // Act
      const tokens = (await queryHolder.instance!._invokeQueryFn()) as Array<{
        priceUSD: number;
      }>;

      // Assert
      expect(tokens[0].priceUSD).toBe(3.5);
    });

    it("sets priceUSD to 0 for tokens not in price map", async () => {
      // Arrange
      mockListTokens.mockResolvedValueOnce([makeToken("unpriced-token", true)]);
      mockIcrcGetBalance.mockResolvedValueOnce(0n);
      mockTokenPriceHolder.data = {};

      // Act
      const tokens = (await queryHolder.instance!._invokeQueryFn()) as Array<{
        priceUSD: number;
      }>;

      // Assert
      expect(tokens[0].priceUSD).toBe(0);
    });

    it("calls sortWalletTokens with enriched tokens before returning", async () => {
      // Arrange
      mockListTokens.mockResolvedValueOnce([makeToken("token-a", true)]);
      mockIcrcGetBalance.mockResolvedValueOnce(100n);
      mockTokenPriceHolder.data = {};

      // Act
      await queryHolder.instance!._invokeQueryFn();

      // Assert
      expect(mockSortWalletTokens).toHaveBeenCalledTimes(1);
    });
  });
});
