import * as cashierBackend from "$lib/generated/cashier_backend/cashier_backend.did";
import { responseToResult } from "$lib/result";
import { authState } from "$modules/auth/state/auth.svelte";
import { CASHIER_BACKEND_CANISTER_ID } from "$modules/shared/constants";
import { Err, type Result } from "ts-results-es";
import type { CreateLinkData } from "../types/createLinkData";

/**
 * Service for interacting with the Cashier Backend canister.
 */
class CanisterBackendService {
  /**
   * Get the authenticated cashierBackend actor for the current user.
   *
   * @throws Error if the user is not authenticated
   */
  #getActor(): cashierBackend._SERVICE | null {
    return authState.buildActor({
      canisterId: CASHIER_BACKEND_CANISTER_ID,
      idlFactory: cashierBackend.idlFactory,
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
    const actor = this.#getActor();
    if (!actor) {
      return Err(new Error("User not logged in"));
    }
    const response = await actor.get_links([
      {
        offset: BigInt(params.limit),
        limit: BigInt(params.offset),
      },
    ]);

    return responseToResult(response)
      .map((res) => res.data)
      .mapErr((err) => new Error(err));
  }

  /**
   * Creates a new link using the v2 API format with enhanced features.
   * Validates the input and returns the full GetLinkResp on success.
   * @param input The CreateLinkData containing link creation details.
   * @returns A Result containing GetLinkResp or an Error.
   */
  async createLinkV2(
    input: CreateLinkData,
  ): Promise<Result<cashierBackend.GetLinkResp, Error>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    const request = input.toCreateLinkInput();

    if (request.isErr()) {
      return Err(request.unwrapErr());
    }

    const response = await actor.create_link_v2(request.unwrap());

    return responseToResult(response)
      .map((res) => res)
      .mapErr((err) => new Error(JSON.stringify(err)));
  }

  /**
   * Activate a link v2 by id. Only the link owner may call this via an authenticated actor.
   * @param id The ID of the link to activate.
   * @returns A Result containing LinkDto or an Error.
   */
  async activateLinkV2(
    id: string,
  ): Promise<Result<cashierBackend.LinkDto, Error>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    const response = await actor.activate_link_v2(id);

    return responseToResult(response)
      .map((res) => res)
      .mapErr((err) => new Error(JSON.stringify(err)));
  }

  /**
   * Retrieve a single link by id. This method calls the canister's `get_link` query
   * and returns the GetLinkResp on success.
   * @param id The ID of the link to retrieve.
   * @param options Optional GetLinkOptions to add action type if needed
   * @returns A Result containing GetLinkResp or an Error.
   */
  async getLink(
    id: string,
    options?: cashierBackend.GetLinkOptions,
  ): Promise<Result<cashierBackend.GetLinkResp, Error>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    // The generated actor expects the options as an Opt<GetLinkOptions> -> [] | [GetLinkOptions]
    const opt: [] | [cashierBackend.GetLinkOptions] = options ? [options] : [];
    const response = await actor.get_link(id, opt);

    return responseToResult(response)
      .map((res) => res)
      .mapErr((err) => new Error(JSON.stringify(err)));
  }

  /**
   * Update a link (used for state transitions like ending a link)
   */
  async updateLink(
    input: cashierBackend.UpdateLinkInput,
  ): Promise<Result<cashierBackend.LinkDto, Error>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    const response = await actor.update_link(input);

    return responseToResult(response)
      .map((res) => res)
      .mapErr((err) => new Error(JSON.stringify(err)));
  }
}

export const cashierBackendService = new CanisterBackendService();
