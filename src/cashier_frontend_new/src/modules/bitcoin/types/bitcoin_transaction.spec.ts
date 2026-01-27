import { BitcoinTransactionMapper } from "$modules/bitcoin/types/bitcoin_transaction";
import type { MempoolTransaction } from "$modules/bitcoin/types/mempool";
import { Principal } from "@dfinity/principal";
import { describe, expect, it } from "vitest";

describe("BitcoinTransactionMapper", () => {
  describe("fromMempoolApiResponse", () => {
    it("should convert confirmed transaction with all fields", () => {
      // Arrange
      const mempoolTx: MempoolTransaction = {
        txid: "abc123def456",
        sender: "bc1qsender123",
        vin: [
          {
            txid: "input_tx_1",
            vout: 0,
            prevout: {
              scriptpubkey_type: "v0_p2wpkh",
              scriptpubkey_address: "bc1qsender123",
              value: 50000,
            },
          },
          {
            txid: "input_tx_2",
            vout: 1,
            prevout: {
              scriptpubkey_type: "v0_p2wpkh",
              scriptpubkey_address: "bc1qsender456",
              value: 30000,
            },
          },
        ],
        vout: [
          {
            txid: null,
            vout: null,
            scriptpubkey_type: "v0_p2wpkh",
            scriptpubkey_address: "bc1qreceiver123",
            value: 70000,
          },
          {
            txid: null,
            vout: null,
            scriptpubkey_type: "v0_p2wpkh",
            scriptpubkey_address: "bc1qchange456",
            value: 9000,
          },
        ],
        status: {
          confirmed: true,
          block_height: 800000,
          block_time: 1704067200,
        },
      };
      const currentTs = 1704067300;

      // Act
      const result = BitcoinTransactionMapper.fromMempoolApiResponse(
        mempoolTx,
        currentTs,
      );

      // Assert
      expect(result).toEqual({
        txid: "abc123def456",
        sender: "bc1qsender123",
        vin: [
          {
            txid: "input_tx_1",
            vout: 0,
            value_satoshis: 50000,
            address: "bc1qsender123",
          },
          {
            txid: "input_tx_2",
            vout: 1,
            value_satoshis: 30000,
            address: "bc1qsender456",
          },
        ],
        vout: [
          {
            value_satoshis: 70000,
            address: "bc1qreceiver123",
          },
          {
            value_satoshis: 9000,
            address: "bc1qchange456",
          },
        ],
        is_confirmed: true,
        created_at_ts: currentTs,
        block_id: 800000n,
        block_timestamp: 1704067200n,
      });
    });

    it("should convert unconfirmed transaction with null block fields", () => {
      // Arrange
      const mempoolTx: MempoolTransaction = {
        txid: "unconfirmed_tx",
        sender: "bc1qsender",
        vin: [
          {
            txid: "input_tx",
            vout: 0,
            prevout: {
              scriptpubkey_type: "v0_p2wpkh",
              scriptpubkey_address: "bc1qsender",
              value: 100000,
            },
          },
        ],
        vout: [
          {
            txid: null,
            vout: null,
            scriptpubkey_type: "v0_p2wpkh",
            scriptpubkey_address: "bc1qreceiver",
            value: 95000,
          },
        ],
        status: {
          confirmed: false,
          block_height: null,
          block_time: null,
        },
      };
      const currentTs = 1704067400;

      // Act
      const result = BitcoinTransactionMapper.fromMempoolApiResponse(
        mempoolTx,
        currentTs,
      );

      // Assert
      expect(result.is_confirmed).toBe(false);
      expect(result.block_id).toBeNull();
      expect(result.block_timestamp).toBeNull();
      expect(result.created_at_ts).toBe(currentTs);
    });

    it("should handle empty vin array by setting sender to empty string", () => {
      // Arrange
      const mempoolTx: MempoolTransaction = {
        txid: "coinbase_tx",
        sender: "",
        vin: [], // Coinbase transaction
        vout: [
          {
            txid: null,
            vout: null,
            scriptpubkey_type: "v0_p2wpkh",
            scriptpubkey_address: "bc1qminer",
            value: 625000000,
          },
        ],
        status: {
          confirmed: true,
          block_height: 800001,
          block_time: 1704067800,
        },
      };
      const currentTs = 1704067900;

      // Act
      const result = BitcoinTransactionMapper.fromMempoolApiResponse(
        mempoolTx,
        currentTs,
      );

      // Assert
      expect(result.sender).toBe("");
      expect(result.vin).toEqual([]);
    });

    it("should correctly convert number to bigint for block fields", () => {
      // Arrange
      const mempoolTx: MempoolTransaction = {
        txid: "tx_with_large_block",
        sender: "bc1qsender",
        vin: [
          {
            txid: "input",
            vout: 0,
            prevout: {
              scriptpubkey_type: "v0_p2wpkh",
              scriptpubkey_address: "bc1qsender",
              value: 1000,
            },
          },
        ],
        vout: [
          {
            txid: null,
            vout: null,
            scriptpubkey_type: "v0_p2wpkh",
            scriptpubkey_address: "bc1qreceiver",
            value: 900,
          },
        ],
        status: {
          confirmed: true,
          block_height: 999999,
          block_time: 1799999999,
        },
      };
      const currentTs = 1800000000;

      // Act
      const result = BitcoinTransactionMapper.fromMempoolApiResponse(
        mempoolTx,
        currentTs,
      );

      // Assert
      expect(result.block_id).toBe(999999n);
      expect(result.block_timestamp).toBe(1799999999n);
      expect(typeof result.block_id).toBe("bigint");
      expect(typeof result.block_timestamp).toBe("bigint");
    });
  });

  describe("toCreateBridgeTransactionRequest", () => {
    const mockBitcoinTx = {
      txid: "test_txid",
      sender: "bc1qsender",
      vin: [],
      vout: [
        {
          value_satoshis: 100000,
          address: "bc1qreceiver",
        },
        {
          value_satoshis: 50000,
          address: "bc1qchange",
        },
      ],
      is_confirmed: true,
      created_at_ts: 1704067200,
      block_id: 800000n,
      block_timestamp: 1704067100n,
    };

    it("should create import bridge transaction request", () => {
      // Arrange
      const icpAddress = "aaaaa-aa";
      const senderBtcAddress = "bc1qsender";
      const receiverBtcAddress = "bc1qreceiver";
      const depositFee = 1000n;
      const withdrawalFee = 2000n;
      const isImporting = true;

      // Act
      const result = BitcoinTransactionMapper.toCreateBridgeTransactionRequest(
        icpAddress,
        senderBtcAddress,
        receiverBtcAddress,
        mockBitcoinTx,
        depositFee,
        withdrawalFee,
        isImporting,
      );

      // Assert
      expect(result).toEqual({
        btc_txid: ["test_txid"],
        icp_address: Principal.fromText(icpAddress),
        btc_address: senderBtcAddress,
        asset_infos: [
          {
            asset_type: { BTC: null },
            asset_id: "UTXO",
            amount: 100000n,
            decimals: 8,
          },
        ],
        bridge_type: { Import: null },
        deposit_fee: [depositFee],
        withdrawal_fee: [withdrawalFee],
        created_at_ts: 1704067200n,
      });
    });

    it("should create export bridge transaction request", () => {
      // Arrange
      const icpAddress = "aaaaa-aa";
      const senderBtcAddress = "bc1qsender";
      const receiverBtcAddress = "bc1qreceiver";
      const depositFee = 1000n;
      const withdrawalFee = 2000n;
      const isImporting = false;

      // Act
      const result = BitcoinTransactionMapper.toCreateBridgeTransactionRequest(
        icpAddress,
        senderBtcAddress,
        receiverBtcAddress,
        mockBitcoinTx,
        depositFee,
        withdrawalFee,
        isImporting,
      );

      // Assert
      expect(result).toEqual({
        btc_txid: ["test_txid"],
        icp_address: Principal.fromText(icpAddress),
        btc_address: receiverBtcAddress, // Uses receiver for export
        asset_infos: [], // Empty for export
        bridge_type: { Export: null },
        deposit_fee: [depositFee],
        withdrawal_fee: [withdrawalFee],
        created_at_ts: 1704067200n,
      });
    });

    it("should handle case-insensitive address matching for imports", () => {
      // Arrange
      const icpAddress = "aaaaa-aa";
      const senderBtcAddress = "bc1qsender";
      const receiverBtcAddress = "BC1QRECEIVER"; // Uppercase
      const depositFee = 1000n;
      const withdrawalFee = 2000n;
      const isImporting = true;

      // Act
      const result = BitcoinTransactionMapper.toCreateBridgeTransactionRequest(
        icpAddress,
        senderBtcAddress,
        receiverBtcAddress,
        mockBitcoinTx,
        depositFee,
        withdrawalFee,
        isImporting,
      );

      // Assert
      expect(result.asset_infos).toHaveLength(1);
      expect(result.asset_infos[0].amount).toBe(100000n);
    });

    it("should include multiple matching outputs for imports", () => {
      // Arrange
      const txWithMultipleOutputs = {
        ...mockBitcoinTx,
        vout: [
          { value_satoshis: 100000, address: "bc1qreceiver" },
          { value_satoshis: 50000, address: "bc1qreceiver" },
          { value_satoshis: 25000, address: "bc1qchange" },
        ],
      };
      const icpAddress = "aaaaa-aa";
      const senderBtcAddress = "bc1qsender";
      const receiverBtcAddress = "bc1qreceiver";
      const depositFee = 1000n;
      const withdrawalFee = 2000n;
      const isImporting = true;

      // Act
      const result = BitcoinTransactionMapper.toCreateBridgeTransactionRequest(
        icpAddress,
        senderBtcAddress,
        receiverBtcAddress,
        txWithMultipleOutputs,
        depositFee,
        withdrawalFee,
        isImporting,
      );

      // Assert
      expect(result.asset_infos).toHaveLength(2);
      expect(result.asset_infos[0].amount).toBe(100000n);
      expect(result.asset_infos[1].amount).toBe(50000n);
    });

    it("should convert created_at_ts from number to bigint", () => {
      // Arrange
      const icpAddress = "aaaaa-aa";
      const senderBtcAddress = "bc1qsender";
      const receiverBtcAddress = "bc1qreceiver";
      const depositFee = 1000n;
      const withdrawalFee = 2000n;
      const isImporting = false;

      // Act
      const result = BitcoinTransactionMapper.toCreateBridgeTransactionRequest(
        icpAddress,
        senderBtcAddress,
        receiverBtcAddress,
        mockBitcoinTx,
        depositFee,
        withdrawalFee,
        isImporting,
      );

      // Assert
      expect(result.created_at_ts).toBe(1704067200n);
      expect(typeof result.created_at_ts).toBe("bigint");
    });
  });
});
