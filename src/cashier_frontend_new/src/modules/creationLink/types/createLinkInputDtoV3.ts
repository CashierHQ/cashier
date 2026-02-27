import type { CreateLinkInputV3 } from "$lib/generated/cashier_backend/cashier_backend.did";
import { SharedActionMapper } from "$modules/actionTemplate/types/action";
import { type CreateLinkData } from "$modules/creationLink/types/createLinkData";
import { LinkType, LinkTypeMapper } from "$modules/links/types/link/linkType";
import { type Action as SharedAction } from "$shared";
import { Err, Ok, Result } from "ts-results-es";

/**
 * Mapper for converting CreateLinkData and SharedAction to CreateLinkInputV3 argument for BE API calls.
 */
export class CreateLinkInputDtoV3 {
  /**
   * Convert CreateLinkData and SharedAction to CreateLinkInputV3 argument for backend API calls
   * @param input
   * @param action
   * @returns
   */
  static toCreateLinkInputArgV3(
    input: CreateLinkData,
    action: SharedAction,
  ): Result<CreateLinkInputV3, Error> {
    // Validate link type is supported
    if (
      input.linkType !== LinkType.TIP &&
      input.linkType !== LinkType.AIRDROP &&
      input.linkType !== LinkType.TOKEN_BASKET &&
      input.linkType !== LinkType.TIP_SHARED_TEST &&
      input.linkType !== LinkType.AIRDROP_SHARED_TEST &&
      input.linkType !== LinkType.TOKEN_BASKET_SHARED_TEST
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
    const beLinkType = LinkTypeMapper.toBackendType(input.linkType);
    const beAction = SharedActionMapper.toBackendType(action);

    const inputDto: CreateLinkInputV3 = {
      title: input.title,
      link_type: beLinkType,
      max_use: BigInt(input.maxUse || 1),
      action: beAction,
    };

    return Ok(inputDto);
  }
}
