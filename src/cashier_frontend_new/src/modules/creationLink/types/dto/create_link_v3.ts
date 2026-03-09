import type {
  CreateLinkInputV3 as BackendCreateLinkInputV3,
  CreateLinkResponseV3 as BackendCreateLinkResponseV3,
  Icrc112Request as BackendIcrc112Request,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { SharedActionMapper } from "$modules/actionTemplate/types/action";
import { SharedLinkMapper } from "$modules/actionTemplate/types/link";
import { SharedLinkTypeMapper } from "$modules/actionTemplate/types/link_type";
import type Icrc112Request from "$modules/icrc112/types/icrc112Request";
import {
  Icrc112RequestMapper,
  type Icrc112Requests,
} from "$modules/icrc112/types/icrc112Request";
import type { LinkType as SharedLinkType } from "$shared";
import { type Action as SharedAction, type Link as SharedLink } from "$shared";

/**
 * FE representation of CreateLinkInputV3 expected by the backend.
 */
export type CreateLinkInputV3 = {
  title: string;
  link_type: SharedLinkType;
  max_use: number;
  action: SharedAction;
};

/**
 * FE representation of CreateLinkResponseV3 returned by the backend.
 */
export type CreateLinkResponseV3 = {
  link: SharedLink;
  action: SharedAction;
  icrc112_requests?: Icrc112Requests | null;
};

/**
 * Mapper for converting CreateLinkData and SharedAction to CreateLinkInputV3 argument for BE API calls.
 */
export class CreateLinkInputV3Mapper {
  /**
   * Convert CreateLinkData and SharedAction to CreateLinkInputV3 argument for backend API calls
   * @param link - the SharedLink containing link details
   * @param action - the SharedAction containing action details
   * @returns Result containing CreateLinkInputV3 or an Error if conversion fails
   */
  static toBackendCreateLinkInputArgV3(
    link: SharedLink,
    action: SharedAction,
  ): BackendCreateLinkInputV3 {
    const beLinkType = SharedLinkTypeMapper.toBackendType(link.link_type);
    const beAction = SharedActionMapper.toBackendType(action);

    const inputDto: BackendCreateLinkInputV3 = {
      title: link.title,
      link_type: beLinkType,
      max_use: BigInt(link.max_use ?? 1),
      action: beAction,
    };

    return inputDto;
  }
}

export class CreateLinkResponseV3Mapper {
  /**
   * Map CreateLinkResponseV3 from backend to frontend SharedLink and SharedAction
   * @param response - the CreateLinkResponseV3 from the backend
   * @returns Result containing an object with SharedLink and SharedAction or an Error if mapping fails
   */
  static fromBackendCreateLinkResponseV3(
    response: BackendCreateLinkResponseV3,
  ): CreateLinkResponseV3 {
    const link = SharedLinkMapper.toLocalType(response.link);
    const action = SharedActionMapper.toLocalType(response.action);
    let icrc112_requests: Icrc112Request[][] | undefined = undefined;
    if (response.icrc112_requests && response.icrc112_requests.length === 1) {
      const outer = response.icrc112_requests[0];
      icrc112_requests = outer.map((innerArr) =>
        innerArr.map((r: BackendIcrc112Request) =>
          Icrc112RequestMapper.fromBackendType(r),
        ),
      );
    }

    return {
      link,
      action,
      icrc112_requests,
    };
  }
}
