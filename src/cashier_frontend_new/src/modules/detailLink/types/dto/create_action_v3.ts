import type {
  CreateActionInputV3 as BackendCreateActionInputV3,
  CreateActionResponseV3 as BackendCreateActionResponseV3,
  Icrc112Request as BackendIcrc112Request,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { SharedActionMapper } from "$modules/actionTemplate/types/action";
import { SharedLinkMapper } from "$modules/actionTemplate/types/link";
import type Icrc112Request from "$modules/icrc112/types/icrc112Request";
import {
  Icrc112RequestMapper,
  type Icrc112Requests,
} from "$modules/icrc112/types/icrc112Request";
import type { Action as SharedAction, Link as SharedLink } from "$shared";

export type CreateActionInputV3 = {
  link_id: string;
  action: SharedAction;
};

export type CreateActionResponseV3 = {
  link: SharedLink;
  action: SharedAction;
  icrc112_requests?: Icrc112Requests | null;
};

export class CreateActionInputV3Mapper {
  static toBackendCreateActionInputV3(
    input: CreateActionInputV3,
  ): BackendCreateActionInputV3 {
    return {
      link_id: input.link_id,
      action: SharedActionMapper.toBackendType(input.action),
    };
  }
}

export class CreateActionResponseV3Mapper {
  static fromBackendCreateActionResponseV3(
    response: BackendCreateActionResponseV3,
  ): CreateActionResponseV3 {
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
