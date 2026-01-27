import type * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import {
  BridgeAssetType,
  BridgeTransactionMapper,
  BridgeTransactionStatus,
  BridgeType,
  type BridgeTransaction,
} from "$modules/bitcoin/types/bridge_transaction";
import { CKBTC_CANISTER_ID } from "$modules/token/constants";
import { FlowDirection } from "$modules/transactionCart/types/transactionSource";
import { AssetProcessState } from "$modules/transactionCart/types/txCart";
import { Principal } from "@dfinity/principal";
import { describe, expect, it } from "vitest";

describe("BridgeTransactionMapper", () => {
  describe("fromTokenStorageBridgeTransaction", () => {
    it("should convert complete bridge transaction with all fields", () => {
      // Arrange
      const mockDto: tokenStorage.UserBridgeTransactionDto = {
        bridge_id: "bridge_123",
        icp_address: Principal.fromText("aaaaa-aa"),
        btc_address: "bc1qsender123",
        asset_infos: [
          {
            asset_type: { BTC: null },
            asset_id: "UTXO",
            amount: 100000n,
            decimals: 8,
          },
        ],
        bridge_type: { Import: null },
        total_amount: [150000n],
        created_at_ts: 1704067200n,
        deposit_fee: [1000n],
        withdrawal_fee: [2000n],
        btc_txid: ["tx_abc123"],
        block_id: [800000n],
        block_timestamp: [1704067100n],
        block_confirmations: [
          { block_id: 800000n, block_timestamp: 1704067100n },
          { block_id: 800001n, block_timestamp: 1704067700n },
        ],
        retry_times: 0,
        status: { Created: null },
      };

      // Act
      const result =
        BridgeTransactionMapper.fromTokenStorageBridgeTransaction(mockDto);

      // Assert
      expect(result).toEqual({
        bridge_id: "bridge_123",
        icp_address: "aaaaa-aa",
        btc_address: "bc1qsender123",
        asset_infos: [
          {
            asset_type: BridgeAssetType.BTC,
            asset_id: "UTXO",
            amount: 100000n,
            decimals: 8,
          },
        ],
        bridge_type: BridgeType.Import,
        total_amount: 150000n,
        created_at_ts: 1704067200n,
        deposit_fee: 1000n,
        withdrawal_fee: 2000n,
        btc_txid: "tx_abc123",
        block_id: 800000n,
        block_timestamp: 1704067100n,
        confirmations: [
          { block_id: 800000n, block_timestamp: 1704067100n },
          { block_id: 800001n, block_timestamp: 1704067700n },
        ],
        retry_times: 0,
        status: BridgeTransactionStatus.Created,
      });
    });

    it("should handle empty optional fields (unconfirmed transaction)", () => {
      // Arrange
      const mockDto: tokenStorage.UserBridgeTransactionDto = {
        bridge_id: "bridge_456",
        icp_address: Principal.fromText("aaaaa-aa"),
        btc_address: "bc1qreceiver",
        asset_infos: [],
        bridge_type: { Export: null },
        total_amount: [],
        created_at_ts: 1704067300n,
        deposit_fee: [],
        withdrawal_fee: [],
        btc_txid: [],
        block_id: [],
        block_timestamp: [],
        block_confirmations: [],
        retry_times: 2,
        status: { Pending: null },
      };

      // Act
      const result =
        BridgeTransactionMapper.fromTokenStorageBridgeTransaction(mockDto);

      // Assert
      expect(result.total_amount).toBe(0n);
      expect(result.deposit_fee).toBe(0n);
      expect(result.withdrawal_fee).toBe(0n);
      expect(result.btc_txid).toBeNull();
      expect(result.block_id).toBeNull();
      expect(result.block_timestamp).toBeNull();
      expect(result.confirmations).toEqual([]);
      expect(result.retry_times).toBe(2);
      expect(result.status).toBe(BridgeTransactionStatus.Pending);
    });

    it("should handle multiple asset types", () => {
      // Arrange
      const mockDto: tokenStorage.UserBridgeTransactionDto = {
        bridge_id: "bridge_789",
        icp_address: Principal.fromText("aaaaa-aa"),
        btc_address: "bc1qmulti",
        asset_infos: [
          {
            asset_type: { BTC: null },
            asset_id: "UTXO",
            amount: 50000n,
            decimals: 8,
          },
          {
            asset_type: { Runes: null },
            asset_id: "RUNE_TOKEN",
            amount: 1000000n,
            decimals: 6,
          },
          {
            asset_type: { Ordinals: null },
            asset_id: "INSCRIPTION_123",
            amount: 1n,
            decimals: 0,
          },
        ],
        bridge_type: { Import: null },
        total_amount: [],
        created_at_ts: 1704067400n,
        deposit_fee: [],
        withdrawal_fee: [],
        btc_txid: [],
        block_id: [],
        block_timestamp: [],
        block_confirmations: [],
        retry_times: 0,
        status: { Completed: null },
      };

      // Act
      const result =
        BridgeTransactionMapper.fromTokenStorageBridgeTransaction(mockDto);

      // Assert
      expect(result.asset_infos).toHaveLength(3);
      expect(result.asset_infos[0].asset_type).toBe(BridgeAssetType.BTC);
      expect(result.asset_infos[1].asset_type).toBe(BridgeAssetType.Runes);
      expect(result.asset_infos[2].asset_type).toBe(BridgeAssetType.Ordinals);
    });

    it("should handle failed transaction status", () => {
      // Arrange
      const mockDto: tokenStorage.UserBridgeTransactionDto = {
        bridge_id: "bridge_failed",
        icp_address: Principal.fromText("aaaaa-aa"),
        btc_address: "bc1qfailed",
        asset_infos: [],
        bridge_type: { Export: null },
        total_amount: [],
        created_at_ts: 1704067500n,
        deposit_fee: [],
        withdrawal_fee: [],
        btc_txid: [],
        block_id: [],
        block_timestamp: [],
        block_confirmations: [],
        retry_times: 5,
        status: { Failed: null },
      };

      // Act
      const result =
        BridgeTransactionMapper.fromTokenStorageBridgeTransaction(mockDto);

      // Assert
      expect(result.status).toBe(BridgeTransactionStatus.Failed);
      expect(result.retry_times).toBe(5);
    });
  });

  describe("bridgeAssetTypeFromTokenStorage", () => {
    it("should convert BTC asset type", () => {
      const result = BridgeTransactionMapper.bridgeAssetTypeFromTokenStorage({
        BTC: null,
      });
      expect(result).toBe(BridgeAssetType.BTC);
    });

    it("should convert Runes asset type", () => {
      const result = BridgeTransactionMapper.bridgeAssetTypeFromTokenStorage({
        Runes: null,
      });
      expect(result).toBe(BridgeAssetType.Runes);
    });

    it("should convert Ordinals asset type", () => {
      const result = BridgeTransactionMapper.bridgeAssetTypeFromTokenStorage({
        Ordinals: null,
      });
      expect(result).toBe(BridgeAssetType.Ordinals);
    });

    it("should throw error for unknown asset type", () => {
      expect(() =>
        BridgeTransactionMapper.bridgeAssetTypeFromTokenStorage(
          {} as tokenStorage.BridgeAssetType,
        ),
      ).toThrow("Unknown BridgeAssetType");
    });
  });

  describe("bridgeTypeFromTokenStorage", () => {
    it("should convert Import bridge type", () => {
      const result = BridgeTransactionMapper.bridgeTypeFromTokenStorage({
        Import: null,
      });
      expect(result).toBe(BridgeType.Import);
    });

    it("should convert Export bridge type", () => {
      const result = BridgeTransactionMapper.bridgeTypeFromTokenStorage({
        Export: null,
      });
      expect(result).toBe(BridgeType.Export);
    });

    it("should throw error for unknown bridge type", () => {
      expect(() =>
        BridgeTransactionMapper.bridgeTypeFromTokenStorage(
          {} as tokenStorage.BridgeType,
        ),
      ).toThrow("Unknown BridgeType");
    });
  });

  describe("bridgeTransactionStatusFromTokenStorage", () => {
    it("should convert Created status", () => {
      const result =
        BridgeTransactionMapper.bridgeTransactionStatusFromTokenStorage({
          Created: null,
        });
      expect(result).toBe(BridgeTransactionStatus.Created);
    });

    it("should convert Pending status", () => {
      const result =
        BridgeTransactionMapper.bridgeTransactionStatusFromTokenStorage({
          Pending: null,
        });
      expect(result).toBe(BridgeTransactionStatus.Pending);
    });

    it("should convert Completed status", () => {
      const result =
        BridgeTransactionMapper.bridgeTransactionStatusFromTokenStorage({
          Completed: null,
        });
      expect(result).toBe(BridgeTransactionStatus.Completed);
    });

    it("should convert Failed status", () => {
      const result =
        BridgeTransactionMapper.bridgeTransactionStatusFromTokenStorage({
          Failed: null,
        });
      expect(result).toBe(BridgeTransactionStatus.Failed);
    });

    it("should throw error for unknown status", () => {
      expect(() =>
        BridgeTransactionMapper.bridgeTransactionStatusFromTokenStorage(
          {} as tokenStorage.BridgeTransactionStatus,
        ),
      ).toThrow("Unknown BridgeTransactionStatus");
    });
  });

  describe("toAssetItems", () => {
    it("should convert import transaction with BTC to asset items", () => {
      // Arrange
      const bridge: BridgeTransaction = {
        bridge_id: "bridge_123",
        icp_address: "aaaaa-aa",
        btc_address: "bc1qsender",
        asset_infos: [
          {
            asset_type: BridgeAssetType.BTC,
            asset_id: "UTXO",
            amount: 100000000n,
            decimals: 8,
          },
        ],
        bridge_type: BridgeType.Import,
        total_amount: 100000000n,
        created_at_ts: 1704067200n,
        deposit_fee: 1000n,
        withdrawal_fee: 2000n,
        btc_txid: "tx_123",
        block_id: 800000n,
        block_timestamp: 1704067100n,
        confirmations: [],
        retry_times: 0,
        status: BridgeTransactionStatus.Completed,
      };

      // Act
      const result = BridgeTransactionMapper.toAssetItems(bridge);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        state: AssetProcessState.SUCCEED,
        label: "BTC",
        symbol: "BTC",
        address: CKBTC_CANISTER_ID,
        amount: 100000000n,
        amountFormattedStr: "1.00000000",
        direction: FlowDirection.INCOMING,
      });
    });

    it("should convert export transaction with multiple assets", () => {
      // Arrange
      const bridge: BridgeTransaction = {
        bridge_id: "bridge_456",
        icp_address: "aaaaa-aa",
        btc_address: "bc1qreceiver",
        asset_infos: [
          {
            asset_type: BridgeAssetType.BTC,
            asset_id: "UTXO",
            amount: 50000000n,
            decimals: 8,
          },
          {
            asset_type: BridgeAssetType.Runes,
            asset_id: "RUNE_TOKEN",
            amount: 1000000n,
            decimals: 6,
          },
        ],
        bridge_type: BridgeType.Export,
        total_amount: 0n,
        created_at_ts: 1704067300n,
        deposit_fee: 0n,
        withdrawal_fee: 0n,
        btc_txid: null,
        block_id: null,
        block_timestamp: null,
        confirmations: [],
        retry_times: 0,
        status: BridgeTransactionStatus.Pending,
      };

      // Act
      const result = BridgeTransactionMapper.toAssetItems(bridge);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].direction).toBe(FlowDirection.OUTGOING);
      expect(result[0].state).toBe(AssetProcessState.PROCESSING);
      expect(result[1].label).toBe("Runes");
      expect(result[1].amountFormattedStr).toBe("1.000000");
    });

    it("should handle different transaction statuses", () => {
      // Arrange
      const baseTransaction: BridgeTransaction = {
        bridge_id: "bridge_test",
        icp_address: "aaaaa-aa",
        btc_address: "bc1qtest",
        asset_infos: [
          {
            asset_type: BridgeAssetType.BTC,
            asset_id: "UTXO",
            amount: 1000n,
            decimals: 8,
          },
        ],
        bridge_type: BridgeType.Import,
        total_amount: 1000n,
        created_at_ts: 1704067400n,
        deposit_fee: 100n,
        withdrawal_fee: 200n,
        btc_txid: null,
        block_id: null,
        block_timestamp: null,
        confirmations: [],
        retry_times: 0,
        status: BridgeTransactionStatus.Created,
      };

      // Test Created status
      let result = BridgeTransactionMapper.toAssetItems(baseTransaction);
      expect(result[0].state).toBe(AssetProcessState.CREATED);

      // Test Failed status
      baseTransaction.status = BridgeTransactionStatus.Failed;
      result = BridgeTransactionMapper.toAssetItems(baseTransaction);
      expect(result[0].state).toBe(AssetProcessState.FAILED);

      // Test Pending status
      baseTransaction.status = BridgeTransactionStatus.Pending;
      result = BridgeTransactionMapper.toAssetItems(baseTransaction);
      expect(result[0].state).toBe(AssetProcessState.PROCESSING);

      // Test Completed status
      baseTransaction.status = BridgeTransactionStatus.Completed;
      result = BridgeTransactionMapper.toAssetItems(baseTransaction);
      expect(result[0].state).toBe(AssetProcessState.SUCCEED);
    });

    it("should handle Ordinals asset type", () => {
      // Arrange
      const bridge: BridgeTransaction = {
        bridge_id: "bridge_ordinals",
        icp_address: "aaaaa-aa",
        btc_address: "bc1qordinals",
        asset_infos: [
          {
            asset_type: BridgeAssetType.Ordinals,
            asset_id: "INSCRIPTION_999",
            amount: 1n,
            decimals: 0,
          },
        ],
        bridge_type: BridgeType.Import,
        total_amount: 1n,
        created_at_ts: 1704067500n,
        deposit_fee: 0n,
        withdrawal_fee: 0n,
        btc_txid: null,
        block_id: null,
        block_timestamp: null,
        confirmations: [],
        retry_times: 0,
        status: BridgeTransactionStatus.Created,
      };

      // Act
      const result = BridgeTransactionMapper.toAssetItems(bridge);

      // Assert
      expect(result[0].label).toBe("Ordinals");
      expect(result[0].symbol).toBe("Ordinals");
      expect(result[0].address).toBe("N/A");
      expect(result[0].amountFormattedStr).toBe("1");
    });
  });

  describe("toBridgeTransactionStatusCanister", () => {
    it("should convert Created status to canister format", () => {
      const result = BridgeTransactionMapper.toBridgeTransactionStatusCanister(
        BridgeTransactionStatus.Created,
      );
      expect(result).toEqual({ Created: null });
    });

    it("should convert Pending status to canister format", () => {
      const result = BridgeTransactionMapper.toBridgeTransactionStatusCanister(
        BridgeTransactionStatus.Pending,
      );
      expect(result).toEqual({ Pending: null });
    });

    it("should convert Completed status to canister format", () => {
      const result = BridgeTransactionMapper.toBridgeTransactionStatusCanister(
        BridgeTransactionStatus.Completed,
      );
      expect(result).toEqual({ Completed: null });
    });

    it("should convert Failed status to canister format", () => {
      const result = BridgeTransactionMapper.toBridgeTransactionStatusCanister(
        BridgeTransactionStatus.Failed,
      );
      expect(result).toEqual({ Failed: null });
    });
  });

  describe("toUpdateBridgeTransactionArgs", () => {
    it("should create update args with all fields", () => {
      // Arrange
      const bridgeId = "bridge_update_123";
      const status = BridgeTransactionStatus.Completed;
      const block_id = 800000n;
      const block_timestamp = 1704067200n;
      const confirmations = [
        { block_id: 800000n, block_timestamp: 1704067200n },
        { block_id: 800001n, block_timestamp: 1704067800n },
      ];
      const btc_txid = "tx_update_123";
      const deposit_fee = 1000n;
      const withdrawal_fee = 2000n;
      const retry_times = 3;

      // Act
      const result = BridgeTransactionMapper.toUpdateBridgeTransactionArgs(
        bridgeId,
        status,
        block_id,
        block_timestamp,
        confirmations,
        btc_txid,
        deposit_fee,
        withdrawal_fee,
        retry_times,
      );

      // Assert
      expect(result).toEqual({
        bridge_id: bridgeId,
        status: [{ Completed: null }],
        block_id: [800000n],
        block_timestamp: [1704067200n],
        block_confirmations: [
          [
            { block_id: 800000n, block_timestamp: 1704067200n },
            { block_id: 800001n, block_timestamp: 1704067800n },
          ],
        ],
        btc_txid: ["tx_update_123"],
        deposit_fee: [1000n],
        withdrawal_fee: [2000n],
        retry_times: [3],
      });
    });

    it("should create update args with null/empty optional fields", () => {
      // Arrange
      const bridgeId = "bridge_partial_update";

      // Act
      const result = BridgeTransactionMapper.toUpdateBridgeTransactionArgs(
        bridgeId,
        null,
        null,
        null,
        [],
        null,
        null,
        null,
        null,
      );

      // Assert
      expect(result).toEqual({
        bridge_id: bridgeId,
        status: [],
        block_id: [],
        block_timestamp: [],
        block_confirmations: [],
        btc_txid: [],
        deposit_fee: [],
        withdrawal_fee: [],
        retry_times: [],
      });
    });

    it("should create update args with only status", () => {
      // Arrange
      const bridgeId = "bridge_status_update";
      const status = BridgeTransactionStatus.Pending;

      // Act
      const result = BridgeTransactionMapper.toUpdateBridgeTransactionArgs(
        bridgeId,
        status,
      );

      // Assert
      expect(result.bridge_id).toBe(bridgeId);
      expect(result.status).toEqual([{ Pending: null }]);
      expect(result.block_id).toEqual([]);
      expect(result.block_timestamp).toEqual([]);
      expect(result.btc_txid).toEqual([]);
    });

    it("should handle single confirmation", () => {
      // Arrange
      const bridgeId = "bridge_single_conf";
      const confirmations = [
        { block_id: 800000n, block_timestamp: 1704067200n },
      ];

      // Act
      const result = BridgeTransactionMapper.toUpdateBridgeTransactionArgs(
        bridgeId,
        null,
        null,
        null,
        confirmations,
      );

      // Assert
      expect(result.block_confirmations).toEqual([
        [{ block_id: 800000n, block_timestamp: 1704067200n }],
      ]);
    });
  });
});
