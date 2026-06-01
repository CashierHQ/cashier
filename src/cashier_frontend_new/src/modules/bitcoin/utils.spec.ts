import type * as ckBTCMinter from "$lib/generated/ckbtc_minter/ckbtc_minter.did";
import {
  BridgeAssetType,
  BridgeTransactionStatus,
  BridgeType,
  type BridgeTransaction,
  type BridgeTransactionWithUsdValue,
} from "$modules/bitcoin/types/bridge_transaction";
import { RetrieveBtcStatusKind } from "$modules/bitcoin/types/ckbtc_minter";
import {
  enrichBridgeTransactionWithUsdValue,
  groupBridgeTransactionsByDate,
  mapRetrieveBtcStatus,
  txidToHex,
} from "$modules/bitcoin/utils";
import { describe, expect, it } from "vitest";

const fixture_of_bridge_transaction = (
  overrides: Partial<BridgeTransaction> = {},
): BridgeTransaction => ({
  bridge_id: "bridge_1",
  icp_address: "aaaaa-aa",
  btc_address: "tb1qexample",
  asset_infos: [
    {
      asset_type: BridgeAssetType.BTC,
      asset_id: "ckbtc",
      amount: 100_000_000n,
      decimals: 8,
    },
  ],
  bridge_type: BridgeType.Import,
  total_amount: 100_000_000n,
  created_at_ts: 1_704_067_200n,

  btc_fee: 0n,
  btc_txid: "txid_1",
  block_id: 840_000n,
  block_timestamp: 1_704_067_100n,
  confirmations: [],
  vin: [],
  vout: [],
  retry_times: 0,
  status: BridgeTransactionStatus.Pending,
  details: {
    kind: "ckbtc" as const,
    ckbtc_block_id: null,
    deposit_fee_btc_sats: null,
    withdrawal_fee_btc_sats: null,
  },
  ...overrides,
});

const fixture_of_bridge_transaction_with_usd_value = (
  overrides: Partial<BridgeTransactionWithUsdValue> = {},
): BridgeTransactionWithUsdValue => ({
  ...fixture_of_bridge_transaction(overrides),
  total_amount_usd: 0,
  ...overrides,
});

const fixture_of_confirmed_status = (): ckBTCMinter.RetrieveBtcStatusV2 => ({
  Confirmed: {
    txid: Uint8Array.from([0x01, 0x0a, 0xff]),
  },
});

describe("mapRetrieveBtcStatus", () => {
  it("it_should_fail_map_retrieve_btc_status_due_to_unknown_status", () => {
    // Arrange
    const fixture_of_unknown_status = {} as ckBTCMinter.RetrieveBtcStatusV2;

    // Act / Assert
    expect(() => mapRetrieveBtcStatus(fixture_of_unknown_status)).toThrow(
      "Unknown retrieve BTC status",
    );
  });

  it("it_should_map_confirmed_retrieve_btc_status", () => {
    // Arrange
    const fixture_of_status = fixture_of_confirmed_status();

    // Act
    const result = mapRetrieveBtcStatus(fixture_of_status);

    // Assert
    expect(result).toEqual({
      kind: RetrieveBtcStatusKind.Confirmed,
      txid: "ff0a01",
    });
  });

  it("it_should_map_pending_retrieve_btc_status", () => {
    // Arrange
    const fixture_of_status: ckBTCMinter.RetrieveBtcStatusV2 = {
      Pending: null,
    };

    // Act
    const result = mapRetrieveBtcStatus(fixture_of_status);

    // Assert
    expect(result).toEqual({
      kind: RetrieveBtcStatusKind.Pending,
      txid: null,
    });
  });
});

describe("groupBridgeTransactionsByDate", () => {
  it("it_should_group_bridge_transactions_by_utc_date", () => {
    // Arrange
    const fixture_of_bridge_transactions = [
      fixture_of_bridge_transaction_with_usd_value({
        bridge_id: "bridge_1",
        created_at_ts: 1_704_067_200n,
        total_amount_usd: 500,
      }),
      fixture_of_bridge_transaction_with_usd_value({
        bridge_id: "bridge_2",
        created_at_ts: 1_704_067_299n,
        total_amount_usd: 600,
      }),
      fixture_of_bridge_transaction_with_usd_value({
        bridge_id: "bridge_3",
        created_at_ts: 1_704_153_600n,
        total_amount_usd: 700,
      }),
    ];

    // Act
    const result = groupBridgeTransactionsByDate(
      fixture_of_bridge_transactions,
    );

    // Assert
    expect(Object.keys(result)).toEqual(["Jan 1, 2024", "Jan 2, 2024"]);
    expect(result["Jan 1, 2024"].map((tx) => tx.bridge_id)).toEqual([
      "bridge_1",
      "bridge_2",
    ]);
    expect(result["Jan 2, 2024"].map((tx) => tx.bridge_id)).toEqual([
      "bridge_3",
    ]);
  });
});

describe("enrichBridgeTransactionWithUsdValue", () => {
  it("it_should_do_enrich_bridge_transactions_with_usd_value", () => {
    // Arrange
    const fixture_of_bridge_transactions = [
      fixture_of_bridge_transaction({
        bridge_id: "bridge_1",
        total_amount: 200_000_000n,
      }),
    ];

    // Act
    const result = enrichBridgeTransactionWithUsdValue(
      fixture_of_bridge_transactions,
      50_000,
    );

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].total_amount_usd).toBe(100_000);
  });

  it("it_should_do_set_zero_usd_value_when_btc_price_is_missing", () => {
    // Arrange
    const fixture_of_bridge_transactions = [fixture_of_bridge_transaction()];

    // Act
    const result = enrichBridgeTransactionWithUsdValue(
      fixture_of_bridge_transactions,
      null,
    );

    // Assert
    expect(result[0].total_amount_usd).toBe(0);
  });
});

describe("txidToHex", () => {
  it("it_should_do_convert_txid_bytes_to_reversed_hex", () => {
    // Arrange
    const fixture_of_txid = Uint8Array.from([0x00, 0x12, 0xab, 0xff]);

    // Act
    const result = txidToHex(fixture_of_txid);

    // Assert
    expect(result).toBe("ffab1200");
  });
});
