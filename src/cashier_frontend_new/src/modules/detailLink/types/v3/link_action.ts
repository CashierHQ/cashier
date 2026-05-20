import {
  type GetLinkResponseV3 as BackendGetLinkResponseV3,
  type Icrc112Request as BackendIcrc112Request,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { SharedActionMapper } from "$modules/actionTemplate/types/action";
import { SharedLinkMapper } from "$modules/actionTemplate/types/link";
import type Icrc112Request from "$modules/auth/types/icrc112";
import { Icrc112RequestMapper } from "$modules/auth/types/icrc112";
import {
  LinkUserStateMapper,
  type LinkUserStateValue,
} from "$modules/links/types/link/linkUserState";
import type { Action as SharedAction, Link as SharedLink } from "$shared";
import { fromNullable } from "@dfinity/utils";

export class LinkActionV3 {
  link: SharedLink;
  action?: SharedAction | undefined;
  icrc112_requests?: Icrc112Request[][];
  link_user_state?: LinkUserStateValue;

  constructor(
    link: SharedLink,
    action?: SharedAction | undefined,
    icrc112_requests?: Icrc112Request[][],
    link_user_state?: LinkUserStateValue,
  ) {
    this.link = link;
    this.action = action;
    this.icrc112_requests = icrc112_requests;
    this.link_user_state = link_user_state;
  }
}

export class LinkActionV3Mapper {
  static fromBackendResponse(response: BackendGetLinkResponseV3): LinkActionV3 {
    const link = SharedLinkMapper.toLocalType(response.link);
    const actionBE =
      response.action.length > 0 && response.action[0] !== undefined
        ? response.action[0]
        : undefined;
    const action = actionBE
      ? SharedActionMapper.toLocalType(actionBE)
      : undefined;

    let icrc112_requests: Icrc112Request[][] | undefined = undefined;
    if (response.icrc112_requests && response.icrc112_requests.length === 1) {
      const outer = response.icrc112_requests[0];
      icrc112_requests = outer.map((innerArr) =>
        innerArr.map((r: BackendIcrc112Request) =>
          Icrc112RequestMapper.fromBackendType(r),
        ),
      );
    }

    const linkUserStateBE = fromNullable(response.link_user_state);
    const linkUserState = linkUserStateBE
      ? LinkUserStateMapper.fromBackendType(linkUserStateBE)
      : undefined;

    return {
      link,
      action,
      icrc112_requests,
      link_user_state: linkUserState,
    };
  }
}
