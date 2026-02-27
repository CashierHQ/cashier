import type { CreateLinkInputV3 } from "$lib/generated/cashier_backend/cashier_backend.did";
import { type CreateLinkData } from "$modules/creationLink/types/createLinkData";
import { LinkType, LinkTypeMapper } from "$modules/links/types/link/linkType";
import type { Action } from "$shared";
import { Err, Ok, Result } from "ts-results-es";

export class CreateLinkInputDtoV3 {
  /**
   *  Convert CreateLinkData to CreateLinkInput for backend consumption
   * @returns Result wrapping CreateLinkInput or Error if validation fails
   */
  static toCreateLinkInputArgV3(
    input: CreateLinkData,
    action: Action,
  ): Result<CreateLinkInputV3, Error> {
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

    const inputDto: CreateLinkInputV3 = {
      title: input.title,
      link_type: link_type,
      max_use: BigInt(input.maxUse || 1),
      action,
    };

    return Ok(inputDto);
  }
}
