import {
  type Icrc112Request as BackendIcrc112Request,
  type ProcessActionResponseV3 as BackendProcessActionResponseV3,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { SharedActionMapper } from "$modules/actionTemplate/types/action";
import { SharedLinkMapper } from "$modules/actionTemplate/types/link";
import type Icrc112Request from "$modules/auth/types/icrc112";
import { Icrc112RequestMapper } from "$modules/auth/types/icrc112";
import { type Action as SharedAction, type Link as SharedLink } from "$shared";

export type ProcessActionResponseV3 = {
  link: SharedLink;
  action: SharedAction;
  icrc112_requests?: Icrc112Request[][];
  isSuccess: boolean;
  errors: string[];
};

export class ProcessActionResponseV3Mapper {
  static fromBackendResponse(
    response: BackendProcessActionResponseV3,
  ): ProcessActionResponseV3 {
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
      isSuccess: response.is_success,
      errors: response.errors,
    };
  }
}
