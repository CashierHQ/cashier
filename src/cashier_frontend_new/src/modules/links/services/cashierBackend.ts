import * as cashierBackend from "$lib/generated/cashier_backend/cashier_backend.did";
import { responseToResult } from "$lib/result";
import { authState } from "$modules/auth/state/auth.svelte";
import { CASHIER_BACKEND_CANISTER_ID } from "$modules/shared/constants";
import { Err, type Result } from "ts-results-es";
import type { CreateLinkData } from "../types";
import { mapCreateLinkDataToCreateLinkInput } from "../mapper";

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
   */
  async getLinks(): Promise<Result<cashierBackend.LinkDto[], Error>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err(new Error("User not logged in"));
    }
    const response = await actor.get_links([
      {
        offset: BigInt(0),
        limit: BigInt(100),
      },
    ]);

    return responseToResult(response)
      .map((res) => res.data)
      .mapErr((err) => new Error(err));
  }

  /**
   * Creates a new link with the provided data.
   * @param input Data to create a new link
   * @returns
   */
  async createLink(
    input: CreateLinkData,
  ): Promise<Result<cashierBackend.LinkDto, Error>> {
    const actor = this.#getActor();
    if (!actor) {
      return Err(new Error("User not logged in"));
    }

    const request = mapCreateLinkDataToCreateLinkInput(input);

    if (request.isErr()) {
      return Err(request.unwrapErr());
    }

    const response = await actor.create_link(request.unwrap());

    return responseToResult(response)
      .map((res) => res)
      .mapErr((err) => new Error(JSON.stringify(err)));
  }
}

export const cashierBackendService = new CanisterBackendService();
