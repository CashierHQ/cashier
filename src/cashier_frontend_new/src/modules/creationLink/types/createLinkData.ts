import type {
  AssetInfoDto,
  CreateLinkInput,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import Asset from "$modules/links/types/asset";
import {
  LinkType,
  LinkTypeMapper,
  type LinkTypeValue,
} from "$modules/links/types/link/linkType";
import { Principal } from "@dfinity/principal";
import { Err, Ok, Result } from "ts-results-es";

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

export class CreateLinkDataMapper {
  /**
   *  Convert CreateLinkData to CreateLinkInput for backend consumption
   * @returns Result wrapping CreateLinkInput or Error if validation fails
   */
  static toCreateLinkInput(
    input: CreateLinkData,
  ): Result<CreateLinkInput, Error> {
    const link_type = LinkTypeMapper.toBackendType(input.linkType);

    // Validate link type is supported
    if (
      input.linkType !== LinkType.TIP &&
      input.linkType !== LinkType.AIRDROP &&
      input.linkType !== LinkType.TOKEN_BASKET
    ) {
      return Err(
        new Error(
          "Only Tip, Airdrop, and Token Basket link types are supported currently",
        ),
      );
    }

    if (!input.assets) {
      return Err(new Error("Asset is missing"));
    }

    if (input.assets.length === 0) {
      return Err(new Error("Link asset data is missing"));
    }

    // Determine the correct label based on link type
    // For Token Basket, each asset needs a label with its address
    const assetInfo: Array<AssetInfoDto> = input.assets.map((a) => {
      let assetLabel: string;
      if (input.linkType === LinkType.TIP) {
        assetLabel = "SEND_TIP_ASSET";
      } else if (input.linkType === LinkType.AIRDROP) {
        assetLabel = "SEND_AIRDROP_ASSET";
      } else if (input.linkType === LinkType.TOKEN_BASKET) {
        // Token Basket requires address in the label
        assetLabel = `SEND_TOKEN_BASKET_ASSET_${a.address}`;
      } else {
        // This should never happen due to validation above, but TypeScript needs it
        throw new Error(`Unsupported link type: ${input.linkType}`);
      }
      return CreateLinkAssetMapper.toBackendWithLabel(a, assetLabel);
    });

    const inputDto: CreateLinkInput = {
      title: input.title,
      asset_info: assetInfo,
      link_type: link_type,
      link_use_action_max_count: BigInt(input.maxUse || 1),
    };

    return Ok(inputDto);
  }
}
