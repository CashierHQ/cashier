import type { AssetInfoDto } from "$lib/generated/cashier_backend/cashier_backend.did";
import Asset from "$modules/links/types/asset";
import { type LinkTypeValue } from "$modules/links/types/link/linkType";
import { Principal } from "@icp-sdk/core/principal";

export class CreateLinkAsset {
  address: string;
  useAmount: bigint;

  constructor(address: string, useAmount: bigint) {
    this.address = address;
    this.useAmount = useAmount;
  }
}

export class CreateLinkAssetMapper {
  /**
   * Convert CreateLinkAsset to AssetInfoDto for backend consumption
   * @param label Label for the asset info
   * @returns AssetInfoDto
   */
  static toBackendWithLabel(
    asset: CreateLinkAsset,
    label: string,
  ): AssetInfoDto {
    return {
      asset: Asset.IC(Principal.fromText(asset.address)).toBackend(),
      amount_per_link_use_action: BigInt(asset.useAmount),
      label,
    };
  }
}

/** Data required to create a new link */
export class CreateLinkData {
  title: string;
  linkType: LinkTypeValue;
  assets: CreateLinkAsset[];
  maxUse: number;

  constructor({
    title,
    linkType,
    assets,
    maxUse,
  }: {
    title: string;
    linkType: LinkTypeValue;
    assets: CreateLinkAsset[];
    maxUse: number;
  }) {
    this.title = title;
    this.linkType = linkType;
    this.assets = assets;
    this.maxUse = maxUse;
  }
}
