import {
  type GateForUser,
  type GetLinkDetailsResponseV3 as BackendGetLinkDetailsResponseV3,
  type GetLinkResponseV3 as BackendGetLinkResponseV3,
  type Icrc112Request as BackendIcrc112Request,
} from "$lib/generated/cashier_backend/cashier_backend.did";
import { SharedActionMapper } from "$modules/actionTemplate/types/action";
import { SharedLinkMapper } from "$modules/actionTemplate/types/link";
import type Icrc112Request from "$modules/icrc112/types/icrc112Request";
import { Icrc112RequestMapper } from "$modules/icrc112/types/icrc112Request";
import type { Action as SharedAction, Link as SharedLink } from "$shared";

export class LinkActionV3 {
  link: SharedLink;
  actions: SharedAction[];
  icrc112_requests?: Icrc112Request[][];
  gates?: GateForUser[];

  constructor(
    link: SharedLink,
    actions: SharedAction[],
    icrc112_requests?: Icrc112Request[][],
    gates?: GateForUser[],
  ) {
    this.link = link;
    this.actions = actions;
    this.icrc112_requests = icrc112_requests;
    this.gates = gates;
  }
}

export class LinkActionV3Mapper {
  static fromBackendResponse(response: BackendGetLinkResponseV3): LinkActionV3 {
    const link = SharedLinkMapper.toLocalType(response.link);
    const actions = response.actions.map((action) =>
      SharedActionMapper.toLocalType(action),
    );

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
      actions,
      icrc112_requests,
    };
  }

  static fromBackendGetLinkDetailsResponseV3(
    response: BackendGetLinkDetailsResponseV3,
  ): LinkActionV3 {
    const base = LinkActionV3Mapper.fromBackendResponse(
      response as BackendGetLinkResponseV3,
    );
    return { ...base, gates: response.gates };
  }
}
