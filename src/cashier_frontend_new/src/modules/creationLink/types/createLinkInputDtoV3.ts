import type { CreateLinkInputV3 } from "$lib/generated/cashier_backend/cashier_backend.did";
import { SharedActionMapper } from "$modules/actionTemplate/types/action";
import { SharedLinkTypeMapper } from "$modules/actionTemplate/types/link_type";
import { type Action as SharedAction, type Link as SharedLink } from "$shared";
import { Ok, Result } from "ts-results-es";

/**
 * Mapper for converting CreateLinkData and SharedAction to CreateLinkInputV3 argument for BE API calls.
 */
export class CreateLinkInputDtoV3 {
  /**
   * Convert CreateLinkData and SharedAction to CreateLinkInputV3 argument for backend API calls
   * @param link - the SharedLink containing link details
   * @param action - the SharedAction containing action details
   * @returns Result containing CreateLinkInputV3 or an Error if conversion fails
   */
  static toCreateLinkInputArgV3(
    link: SharedLink,
    action: SharedAction,
  ): Result<CreateLinkInputV3, Error> {
    const beLinkType = SharedLinkTypeMapper.toBackendType(link.link_type);
    const beAction = SharedActionMapper.toBackendType(action);

    const inputDto: CreateLinkInputV3 = {
      title: link.title,
      link_type: beLinkType,
      max_use: BigInt(link.max_use || 1),
      action: beAction,
    };

    return Ok(inputDto);
  }
}
