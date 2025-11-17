import * as cashierBackend from "$lib/generated/cashier_backend/cashier_backend.did";
import { responseToResult } from "$lib/result";
import { authState } from "$modules/auth/state/auth.svelte";
import {
  CreateLinkData,
  CreateLinkDataMapper,
} from "$modules/creationLink/types/createLinkData";
import { CASHIER_BACKEND_CANISTER_ID } from "$modules/shared/constants";
import { toNullable } from "@dfinity/utils";
import { Err, type Result } from "ts-results-es";
import {
  ActionTypeMapper,
  type ActionTypeValue,
} from "../types/action/actionType";

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
   * Returns a list of links for the current user.
   * @param offset The offset for pagination.
   * @param limit The maximum number of links to return.
   * @returns A Result containing an array of LinkDto or an Error.
   */
  async getLinks(
    params: {
      offset: number;
      limit: number;
    } = {
      offset: 0,
      limit: 100,
    },
  ): Promise<Result<cashierBackend.LinkDto[], Error>> {
    const actor = this.#getActor({
      anonymous: false,
    });
    if (!actor) {
      return Err(new Error("User not logged in"));
    }
    const response = await actor.user_get_links_v2(
      toNullable({
        offset: BigInt(params.offset),
        limit: BigInt(params.limit),
      }),
    );

    return responseToResult(response)
      .map((res) => res.data)
      .mapErr((err) => new Error(JSON.stringify(err)));
  }

  /**
   * Creates a new link using the v2 API format with enhanced features.
   * Validates the input and returns the full GetLinkResp on success.
   * @param input The CreateLinkData containing link creation details.
   * @returns A Result containing GetLinkResp or an Error.
   */
  async createLinkV2(
    input: CreateLinkData,
  ): Promise<Result<cashierBackend.CreateLinkDto, Error>> {
    const actor = this.#getActor({
      anonymous: false,
    });
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    const request = CreateLinkDataMapper.toCreateLinkInput(input);

    if (request.isErr()) {
      return Err(request.unwrapErr());
    }

    const response = await actor.user_create_link_v2(request.unwrap());

    return responseToResult(response)
      .map((res) => res)
      .mapErr((err) => new Error(JSON.stringify(err)));
  }

  /**
   *  Process an action by its ID. This method calls the canister's `process_action_v2`
   *  @param actionId The ID of the action to process.
   *  @returns A Result containing LinkDto or an Error.
   */
  async processActionV2(
    actionId: string,
  ): Promise<Result<cashierBackend.ProcessActionDto, Error>> {
    const actor = this.#getActor({
      anonymous: false,
    });
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    const response = await actor.user_process_action_v2({
      action_id: actionId,
    });

    return responseToResult(response)
      .map((res) => res)
      .mapErr((err) => new Error(JSON.stringify(err)));
  }

  /**
   * Disable an existing link V2 by its id.
   * @param id The ID of the link to disable
   * @returns A Result containing the disabled LinkDto or an Error.
   */
  async disableLinkV2(
    id: string,
  ): Promise<Result<cashierBackend.LinkDto, Error>> {
    const actor = this.#getActor({
      anonymous: false,
    });
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    const response = await actor.user_disable_link_v2(id);

    return responseToResult(response)
      .map((res) => res)
      .mapErr((err) => new Error(JSON.stringify(err)));
  }

  /**
   * Create a new action using the v2 API format.
   * @param input The CreateActionInput containing action creation details.
   * @returns A Result containing ActionDto or an Error.
   */
  async createActionV2(input: {
    linkId: string;
    actionType: ActionTypeValue;
  }): Promise<Result<cashierBackend.ActionDto, Error>> {
    const actor = this.#getActor({
      anonymous: false,
    });
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    const response = await actor.user_create_action_v2({
      link_id: input.linkId,
      action_type: ActionTypeMapper.toBackendType(input.actionType),
    });

    return responseToResult(response)
      .map((res) => res)
      .mapErr((err) => new Error(JSON.stringify(err)));
  }

  /**
   * Retrieve a single link by id. This method calls the canister's `get_link` query
   * and returns the GetLinkResp on success.
   * @param id The ID of the link to retrieve.
   * @param options Optional GetLinkOptions to add action type if needed.
   *   - When provided, `action_type` will be sent to the canister to request
   *     link details scoped to that action type.
   * @param actorOptions Optional actor options used when building the actor.
   *   - { anonymous?: boolean } — when true the actor is created as anonymous
   *     (useful for public reads where no identity should be attached). If
   *     omitted the actor will be built with the current authenticated user.
   * @returns A Result containing GetLinkResp or an Error.
   */
  async getLink(
    id: string,
    options?: cashierBackend.GetLinkOptions,
    actorOptions?: {
      anonymous: boolean;
    },
  ): Promise<Result<cashierBackend.GetLinkResp, Error>> {
    const actor = this.#getActor({
      anonymous: actorOptions?.anonymous,
    });
    if (!actor) {
      return Err(new Error("User not logged in"));
    }
    const response = await actor.get_link_details_v2(id, toNullable(options));

    return responseToResult(response)
      .map((res) => res)
      .mapErr((err) => new Error(JSON.stringify(err)));
  }
}

export const cashierBackendService = new CanisterBackendService();
