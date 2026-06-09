import * as cashierBackend from "$lib/generated/cashier_backend/cashier_backend.did";
import { responseToResult } from "$lib/result";
import { authState } from "$modules/auth/state/auth.svelte";
import {
  CreateLinkInputV3Mapper,
  CreateLinkResponseV3Mapper,
  type CreateLinkResponseV3,
} from "$modules/creationLink/types/dto/create_link_v3";
import {
  CreateActionInputV3Mapper,
  CreateActionResponseV3Mapper,
  type CreateActionInputV3,
  type CreateActionResponseV3,
} from "$modules/detailLink/types/dto/create_action_v3";
import {
  ProcessActionResponseV3Mapper,
  type ProcessActionResponseV3,
} from "$modules/detailLink/types/dto/process_action_v3";
import { CASHIER_BACKEND_CANISTER_ID } from "$modules/shared/constants";
import { type Action as SharedAction, type Link as SharedLink } from "$shared";
import { toNullable } from "@dfinity/utils";
import { Err, type Result } from "ts-results-es";

/**
 * Service for interacting with the Cashier Backend canister.
 */
class CanisterBackendService {
  /**
   * Get the authenticated cashierBackend actor for the current user.
   *
   * @throws Error if the user is not authenticated
   */
  #getActor({
    anonymous = false,
  }: {
    anonymous?: boolean;
  }): cashierBackend._SERVICE | null {
    return authState.buildActor({
      canisterId: CASHIER_BACKEND_CANISTER_ID,
      idlFactory: cashierBackend.idlFactory,
      options: {
        anonymous,
      },
    });
  }

  /**
   * Returns a list of links for the current user using the V3 API.
   * @param params Pagination parameters (offset, limit)
   * @returns A Result containing paginated Link array and metadata or an Error.
   */
  async getLinksV3(
    params: {
      offset: number;
      limit: number;
    } = {
      offset: 0,
      limit: 100,
    },
  ): Promise<Result<cashierBackend.PaginateResult_1, Error>> {
    const actor = this.#getActor({
      anonymous: false,
    });
    if (!actor) {
      return Err(new Error("User not logged in"));
    }
    const response = await actor.user_get_links_v3(
      toNullable({
        offset: BigInt(params.offset),
        limit: BigInt(params.limit),
      }),
    );

    return responseToResult<
      cashierBackend.PaginateResult_1,
      cashierBackend.CanisterError
    >(response as cashierBackend.Result_13).mapErr(
      (err) => new Error(JSON.stringify(err)),
    );
  }

  /**
   * Creates a new link using the V3 API.
   * Expects shared `Action` and `LinkType` structures from the `$shared` package.
   * @param input V3 link creation payload
   * @returns A Result containing CreateLinkResponseV3 or an Error.
   */
  /**
   * Creates a new link, optionally with one or more gates, using the V3 API.
   * @param link Shared link payload
   * @param action Shared action payload
   * @param gateKeys Gate keys to attach (empty array for no gates)
   * @returns A Result containing CreateLinkResponseV3 or an Error.
   */
  async createLinkV3(
    link: SharedLink,
    action: SharedAction,
    gateKeys: cashierBackend.GateKey[] = [],
  ): Promise<Result<CreateLinkResponseV3, Error>> {
    const actor = this.#getActor({
      anonymous: false,
    });
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    const input = CreateLinkInputV3Mapper.toBackendCreateLinkInputArgV3(
      link,
      action,
      gateKeys,
    );
    const response = await actor.user_create_link_v3(input);

    return responseToResult(
      response as
        | { Ok: cashierBackend.CreateLinkResponseV3 }
        | { Err: cashierBackend.CanisterError },
    )
      .map((res) =>
        CreateLinkResponseV3Mapper.fromBackendCreateLinkResponseV3(res),
      )
      .mapErr((err) => new Error(JSON.stringify(err)));
  }

  /**
   * Retrieve authenticated link details including gate status.
   * @param id The link ID
   * @param options Optional GetLinkOptions
   * @returns A Result containing GetLinkDetailsResponseV3 or an Error.
   */
  async getUserLinkDetailsV3(
    id: string,
    options?: cashierBackend.GetLinkOptions,
  ): Promise<Result<cashierBackend.GetLinkDetailsResponseV3, Error>> {
    const actor = this.#getActor({ anonymous: false });
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    const response = await actor.user_get_link_details_v3(
      id,
      toNullable(options),
    );

    return responseToResult<
      cashierBackend.GetLinkDetailsResponseV3,
      cashierBackend.CanisterError
    >(response as cashierBackend.Result_11).mapErr(
      (err) => new Error(JSON.stringify(err)),
    );
  }

  /**
   * Open a gate on a link by providing the gate key.
   * @param linkId The link ID
   * @param gateId The gate ID to unlock
   * @param gateKey The key to open the gate (e.g. { Password: "..." })
   * @returns A Result containing OpenGateSuccessResult or an Error.
   */
  async openLinkGate(
    linkId: string,
    gateId: string,
    gateKey: cashierBackend.GateKey,
  ): Promise<Result<cashierBackend.OpenGateSuccessResult, Error>> {
    const actor = this.#getActor({ anonymous: false });
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    const response = await actor.user_open_link_gate(linkId, gateId, gateKey);

    return responseToResult<
      cashierBackend.OpenGateSuccessResult,
      cashierBackend.CanisterError
    >(response as cashierBackend.Result_14).mapErr(
      (err) => new Error(JSON.stringify(err)),
    );
  }

  /**
   * Process an action using the V3 API.
   * @param input V3 process action payload
   * @returns A Result containing ProcessActionResultV3 or an Error.
   */
  async processActionV3(
    actionId: string,
  ): Promise<Result<ProcessActionResponseV3, Error>> {
    const actor = this.#getActor({
      anonymous: false,
    });
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    const response = await actor.user_process_action_v3({
      action_id: actionId,
    });

    return responseToResult(
      response as
        | { Ok: cashierBackend.ProcessActionResponseV3 }
        | { Err: cashierBackend.CanisterError },
    )
      .map((res) => ProcessActionResponseV3Mapper.fromBackendResponse(res))
      .mapErr((err) => new Error(JSON.stringify(err)));
  }

  /**
   * Sync the asset balance cache for a link by querying actual token balances.
   * Only the link creator can trigger this.
   * @param linkId The ID of the link to sync.
   * @returns A Result containing the updated link data or an Error.
   */
  async syncAssetBalanceCacheV3(
    linkId: string,
  ): Promise<Result<cashierBackend.DisableLinkResponseV3, Error>> {
    const actor = this.#getActor({ anonymous: false });
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    const response = await actor.user_sync_asset_balance_cache(linkId);

    return responseToResult<
      cashierBackend.DisableLinkResponseV3,
      cashierBackend.CanisterError
    >(response as cashierBackend.Result_10).mapErr(
      (err) => new Error(JSON.stringify(err)),
    );
  }

  /**
   * Disable an existing link using the V3 API.
   * @param linkId The ID of the link to disable.
   * @returns A Result containing DisableLinkResponseV3 or an Error.
   */
  async disableLinkV3(
    linkId: string,
  ): Promise<Result<cashierBackend.DisableLinkResponseV3, Error>> {
    const actor = this.#getActor({
      anonymous: false,
    });
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    const response = await actor.user_disable_link_v3(linkId);

    return responseToResult<
      cashierBackend.DisableLinkResponseV3,
      cashierBackend.CanisterError
    >(response as cashierBackend.Result_10).mapErr(
      (err) => new Error(JSON.stringify(err)),
    );
  }

  /**
   * Create a new action using the V3 API.
   * Expects shared `Action` from the `$shared` package.
   * @param input V3 action creation payload
   * @returns A Result containing CreateActionResponseV3 or an Error.
   */
  async createActionV3(
    input: CreateActionInputV3,
  ): Promise<Result<CreateActionResponseV3, Error>> {
    const actor = this.#getActor({
      anonymous: false,
    });
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    const backendInput =
      CreateActionInputV3Mapper.toBackendCreateActionInputV3(input);
    const response = await actor.user_create_action_v3(backendInput);

    return responseToResult(
      response as
        | { Ok: cashierBackend.CreateActionResponseV3 }
        | { Err: cashierBackend.CanisterError },
    )
      .map((res) =>
        CreateActionResponseV3Mapper.fromBackendCreateActionResponseV3(res),
      )
      .mapErr((err) => new Error(JSON.stringify(err)));
  }

  /**
   * Retrieve a single link by id using the V3 API.
   * @param id The ID of the link to retrieve.
   * @param options Optional GetLinkOptions (e.g. action_type for scoped details).
   * @param actorOptions Optional { anonymous?: boolean } for unauthenticated reads.
   * @returns A Result containing GetLinkResponseV3 or an Error.
   */
  async getLinkV3(
    id: string,
    options?: cashierBackend.GetLinkOptions,
    anonymous?: boolean,
  ): Promise<Result<cashierBackend.GetLinkResponseV3, Error>> {
    const actor = anonymous
      ? this.#getActor({
          anonymous,
        })
      : this.#getActor({
          anonymous: false,
        });
    if (!actor) {
      return Err(new Error("Actor creation failed"));
    }
    const response = await actor.get_link_details_v3(id, toNullable(options));

    return responseToResult<
      cashierBackend.GetLinkResponseV3,
      cashierBackend.CanisterError
    >(response as cashierBackend.Result_3).mapErr(
      (err) => new Error(JSON.stringify(err)),
    );
  }
}

export const cashierBackendService = new CanisterBackendService();
