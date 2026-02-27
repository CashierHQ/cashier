import type {
  AssetInfoDto,
  CreateLinkInput,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import {
  type CreateLinkData,
  CreateLinkAssetMapper,
} from "$modules/creationLink/types/createLinkData";
import { LinkType, LinkTypeMapper } from "$modules/links/types/link/linkType";
import { Err, Ok, Result } from "ts-results-es";

/**
 * Mapper for converting CreateLinkData to CreateLinkInput argument for BE API calls.
 */
export class CreateLinkInputDto {
  /**
   * Convert CreateLinkData to CreateLinkInput argument for backend API calls
   * @param input
   * @returns
   */
  static toCreateLinkInputArg(
    input: CreateLinkData,
  ): Result<CreateLinkInput, Error> {
    const link_type = LinkTypeMapper.toBackendType(input.linkType);

    // Validate link type is supported
    if (
      input.linkType !== LinkType.TIP &&
      input.linkType !== LinkType.AIRDROP &&
      input.linkType !== LinkType.TOKEN_BASKET &&
      input.linkType !== LinkType.TIP_SHARED_TEST
    ) {
      return Err(
        new Error(
          "Only Tip, Airdrop, Token Basket, and Tip Shared Test link types are supported currently",
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
      } else if (input.linkType === LinkType.TIP_SHARED_TEST) {
        assetLabel = "SEND_TIP_ASSET"; // Same as TIP - backend treats it the same
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
