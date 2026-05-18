import type { AssetInfo as BackendAssetInfo } from "$lib/generated/cashier_backend/cashier_backend.did";
import { TokenStandard, type AssetInfo as SharedAssetInfo } from "$shared";
import { Principal } from "@icp-sdk/core/principal";
import { describe, expect, it } from "vitest";
import {
  SharedAssetInfoMapper,
  type SerializedSharedAssetInfo,
} from "$modules/actionTemplate/types/asset_info";

function fixture_of_shared_asset_info(
  available_amount?: bigint,
): SharedAssetInfo {
  return {
    asset: {
      address: Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"),
      token_standard: TokenStandard.ICRC1,
    },
    label: "ICP",
    amount: 1_000_000n,
    available_amount,
  };
}

function fixture_of_backend_asset_info(): BackendAssetInfo {
  return {
    asset: {
      address: Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"),
      token_standard: [{ ICRC1: null }],
      network_fee: [],
    },
    label: "ICP",
    amount: 1_000_000n,
    available_amount: [900_000n],
  };
}

function fixture_of_serialized_shared_asset_info(): SerializedSharedAssetInfo {
  return {
    asset: {
      address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      token_standard: TokenStandard.ICRC1,
    },
    label: "ICP",
    amount: 1_000_000n,
    available_amount: 900_000n,
  };
}

describe("SharedAssetInfoMapper", () => {
  it("it_should_do_map_available_amount_to_backend_type", () => {
    // Arrange
    const asset_info = fixture_of_shared_asset_info(900_000n);

    // Act
    const result = SharedAssetInfoMapper.toBackendType(asset_info);

    // Assert
    expect(result.available_amount).toEqual([900_000n]);
  });

  it("it_should_do_map_available_amount_from_backend_type", () => {
    // Arrange
    const asset_info = fixture_of_backend_asset_info();

    // Act
    const result = SharedAssetInfoMapper.toLocalType(asset_info);

    // Assert
    expect(result.available_amount).toBe(900_000n);
  });

  it("it_should_do_roundtrip_available_amount_through_storage_type", () => {
    // Arrange
    const asset_info = fixture_of_shared_asset_info(900_000n);
    const serialized_asset_info = fixture_of_serialized_shared_asset_info();

    // Act
    const to_storage_result = SharedAssetInfoMapper.toStorageType(asset_info);
    const from_storage_result = SharedAssetInfoMapper.fromStorageType(
      serialized_asset_info,
    );

    // Assert
    expect(to_storage_result.available_amount).toBe(900_000n);
    expect(from_storage_result.available_amount).toBe(900_000n);
  });
});
