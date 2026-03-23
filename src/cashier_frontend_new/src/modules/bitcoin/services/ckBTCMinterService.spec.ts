import type { CkBTCMinterService } from "$modules/bitcoin/services/ckBTCMinterService";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Fixtures
function fixture_of_authenticated_actor(
  overrides: Record<string, unknown> = {},
) {
  return {
    update_balance: vi.fn().mockResolvedValue({ Ok: [] }),
    get_deposit_fee: vi.fn().mockResolvedValue(1000n),
    estimate_withdrawal_fee: vi
      .fn()
      .mockResolvedValue({ minter_fee: 100n, bitcoin_fee: 500n }),
    get_minter_info: vi.fn().mockResolvedValue({
      kyt_fee: 2000n,
      retrieve_btc_min_amount: 10000n,
      min_confirmations: 6,
    }),
    retrieve_btc_with_approval: vi
      .fn()
      .mockResolvedValue({ Ok: { block_index: 42n } }),
    retrieve_btc_status_v2: vi.fn().mockResolvedValue({ Pending: null }),
    retrieve_btc_status_v2_by_account: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

// Mock authState
vi.mock("$modules/auth/state/auth.svelte", () => ({
  authState: {
    buildActor: vi.fn(),
    account: { owner: "aaaaa-aa" },
  },
}));

// Mock constants
vi.mock("$modules/bitcoin/constants", () => ({
  CKBTC_MINTER_CANISTER_ID: "aaaaa-aa",
  MEMPOOL_API_BASE_URLS: ["https://mempool.space/api"],
}));

// Mock idlFactory
vi.mock("$lib/generated/ckbtc_minter/ckbtc_minter.did", () => ({
  idlFactory: vi.fn(),
}));

describe("CkBTCMinterService", () => {
  let service: CkBTCMinterService;
  let mockActor: ReturnType<typeof fixture_of_authenticated_actor>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authStateMock: any;

  beforeEach(async () => {
    vi.resetModules();
    mockActor = fixture_of_authenticated_actor();
    authStateMock = await import("$modules/auth/state/auth.svelte");
    authStateMock.authState.buildActor = vi.fn().mockReturnValue(mockActor);
    const mod = await import("$modules/bitcoin/services/ckBTCMinterService");
    service = mod.ckBTCMinterService;
  });

  describe("updateBalanceWithMintedInfo", () => {
    it("it_should_fail_update_balance_with_minted_info_due_to_canister_error", async () => {
      // Arrange
      mockActor.update_balance = vi.fn().mockResolvedValue({
        Err: { TemporarilyUnavailable: "Canister is unavailable" },
      });
      authStateMock.authState.buildActor = vi.fn().mockReturnValue(mockActor);

      // Act
      const result = await service.updateBalanceWithMintedInfo();

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain("Failed to update balance");
    });

    it("it_should_return_empty_when_no_new_utxos_error", async () => {
      // Arrange — NoNewUtxos is not a real error, treat as Ok([])
      mockActor.update_balance = vi.fn().mockResolvedValue({
        Err: {
          NoNewUtxos: {
            required_confirmations: 4,
            pending_utxos: [],
            current_confirmations: [],
          },
        },
      });
      authStateMock.authState.buildActor = vi.fn().mockReturnValue(mockActor);

      // Act
      const result = await service.updateBalanceWithMintedInfo();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(0);
    });

    it("it_should_return_empty_when_no_minted_utxos", async () => {
      // Arrange
      mockActor.update_balance = vi.fn().mockResolvedValue({
        Ok: [
          {
            Checked: {
              outpoint: { txid: new Uint8Array(), vout: 0 },
              value: 5000n,
              height: 840000,
            },
          },
        ],
      });
      authStateMock.authState.buildActor = vi.fn().mockReturnValue(mockActor);

      // Act
      const result = await service.updateBalanceWithMintedInfo();

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(0);
    });

    it("it_should_return_minted_utxo_info", async () => {
      // Arrange
      mockActor.update_balance = vi.fn().mockResolvedValue({
        Ok: [
          {
            Minted: {
              block_index: 123n,
              minted_amount: 50000n,
              utxo: {
                height: 840000,
                value: 50000n,
                outpoint: {
                  txid: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
                  vout: 0,
                },
              },
            },
          },
          {
            Checked: {
              outpoint: { txid: new Uint8Array(), vout: 0 },
              value: 5000n,
              height: 840000,
            },
          },
          {
            Minted: {
              block_index: 456n,
              minted_amount: 30000n,
              utxo: {
                height: 840001,
                value: 30000n,
                outpoint: { txid: new Uint8Array([0xca, 0xfe]), vout: 1 },
              },
            },
          },
        ],
      });
      authStateMock.authState.buildActor = vi.fn().mockReturnValue(mockActor);

      // Act
      const result = await service.updateBalanceWithMintedInfo();

      // Assert
      expect(result.isOk()).toBe(true);
      const mintedInfos = result.unwrap();
      expect(mintedInfos).toHaveLength(2);
      expect(mintedInfos[0]).toEqual({
        blockIndex: 123n,
        mintedAmount: 50000n,
        btcTxid: "deadbeef",
        btcHeight: 840000,
      });
      expect(mintedInfos[1]).toEqual({
        blockIndex: 456n,
        mintedAmount: 30000n,
        btcTxid: "cafe",
        btcHeight: 840001,
      });
    });
  });
});
