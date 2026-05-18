import type {
  Asset as BackendAsset,
  AssetInfoDto as BackendAssetInfoDto,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { rsMatch } from "$lib/rsMatch";
import type {
  Asset as SharedAsset,
  AssetInfo as SharedAssetInfo,
} from "$shared";
import type { Principal } from "@icp-sdk/core/principal";

export class Asset {
  // Currently only IC is modeled in the backend union. Keep wrapper for future extensibility.
  private constructor(
    public readonly chain: string,
    public readonly address?: Principal,
  ) {}

  static IC(address: Principal) {
    return new Asset("IC", address);
  }
}

class AssetMapper {
  static toBackendType(asset: Asset): BackendAsset {
    if (asset.chain === "IC") {
      return {
        IC: { address: asset.address as unknown as Principal },
      };
    }
    throw new Error(`Unsupported asset chain: ${asset.chain}`);
  }

  static fromBackendType(b: BackendAsset): Asset {
    return rsMatch(b, {
      IC: (v) => Asset.IC(v.address),
    });
  }

  static fromSharedType(a: SharedAsset): Asset {
    return Asset.IC(a.address);
  }
}

export class AssetInfo {
  asset: Asset;
  amount_per_link_use_action: bigint;
  label: string;
  available_amount?: bigint;

  constructor(
    asset: Asset,
    amount_per_link_use_action: bigint,
    label: string,
    available_amount?: bigint,
  ) {
    this.asset = asset;
    this.amount_per_link_use_action = amount_per_link_use_action;
    this.label = label;
    this.available_amount = available_amount;
  }
}

export class AssetInfoMapper {
  static toBackendType(asseInfo: AssetInfo): BackendAssetInfoDto {
    return {
      asset: AssetMapper.toBackendType(asseInfo.asset),
      amount_per_link_use_action: asseInfo.amount_per_link_use_action,
      label: asseInfo.label,
    };
  }

  static fromBackendType(b: BackendAssetInfoDto): AssetInfo {
    return new AssetInfo(
      AssetMapper.fromBackendType(b.asset),
      b.amount_per_link_use_action,
      b.label,
    );
  }

  static fromSharedType(a: SharedAssetInfo): AssetInfo {
    return new AssetInfo(
      AssetMapper.fromSharedType(a.asset),
      a.amount,
      a.label,
      a.available_amount,
    );
  }
}
