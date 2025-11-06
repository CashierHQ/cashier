import type {
  AssetInfoDto,
  CreateLinkInput,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { Principal } from "@dfinity/principal";
import { Err, Ok, Result } from "ts-results-es";
import Asset from "./asset";
import { LinkType, LinkTypeMapper, type LinkTypeValue } from "./link/linkType";

export class CreateLinkAsset {
  address: string;
  useAmount: bigint;

  constructor(address: string, useAmount: bigint) {
    this.address = address;
    this.useAmount = useAmount;
  }

  /**
   * Convert CreateLinkAsset to AssetInfoDto for backend consumption
   * @param label Label for the asset info
   * @returns AssetInfoDto
   */
  toBackendWithLabel(label: string): AssetInfoDto {
    return {
      asset: Asset.IC(Principal.fromText(this.address)).toBackend(),
      amount_per_link_use_action: BigInt(this.useAmount),
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

export class CreateLinkDataMapper {
  /**
   *  Convert CreateLinkData to CreateLinkInput for backend consumption
   * @returns Result wrapping CreateLinkInput or Error if validation fails
   */
  static toCreateLinkInput(
    input: CreateLinkData,
  ): Result<CreateLinkInput, Error> {
    const link_type = LinkTypeMapper.toBackendType(input.linkType);

    if (input.linkType != LinkType.TIP) {
      return Err(new Error("Only tip links are supported"));
    }

    if (!input.assets) {
      return Err(new Error("Asset is missing"));
    }

    if (input.assets.length === 0) {
      return Err(new Error("Tip link asset data is missing"));
    }

    const assetInfo: Array<AssetInfoDto> = input.assets.map((a) =>
      a.toBackendWithLabel("SEND_TIP_ASSET"),
    );

    const inputDto: CreateLinkInput = {
      title: input.title,
      asset_info: assetInfo,
      link_type: link_type,
      link_use_action_max_count: 1n,
    };

    return Ok(inputDto);
  }
}
