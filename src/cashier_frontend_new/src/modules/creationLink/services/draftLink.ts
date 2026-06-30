import { authState } from "$modules/auth/state/auth.svelte";
import { draftLinkRepository } from "$modules/creationLink/repositories/draftLinkRepository";
import type {
  DraftLink,
  DraftLinkUpdateParams,
} from "$modules/creationLink/types";
import {
  LinkState as SharedLinkState,
  LinkType as SharedLinkType,
  type Link as SharedLink,
} from "$shared";
import { Principal } from "@icp-sdk/core/principal";
import { Err, Ok, Result } from "ts-results-es";

/**
 * Service encapsulating the logic to create and manage draft links.
 */
export class DraftLinkService {
  /**
   * Creates a new draft link for a principal and persists it locally.
   *
   * @param principalId - Principal that owns the draft link.
   * @returns Result containing the created draft link or an error.
   */
  createAndPersistDraftLink(principalId: Principal): Result<SharedLink, Error> {
    const createResult = this.createDraftLinkFromPrincipalId(principalId);
    if (createResult.isErr()) {
      return Err(
        new Error("Create draft link failed: " + createResult.unwrapErr()),
      );
    }
    try {
      const draftLink = createResult.unwrap();
      draftLinkRepository.create({
        id: draftLink.id,
        draftLink,
        owner: principalId.toText(),
      });
    } catch (error) {
      return Err(new Error("Failed to save draft link: " + error));
    }
    return createResult;
  }

  /**
   * Creates a new unsaved draft link for a principal.
   *
   * @param principalId - Principal that owns the draft link.
   * @returns Result containing the created draft link or an error.
   */
  createDraftLinkFromPrincipalId(
    principalId: Principal,
  ): Result<SharedLink, Error> {
    const ts = Date.now();
    const tsInNanoSec = BigInt(ts) * 1000000n;
    const id = principalId.toText() + "-" + ts.toString();
    const creator = principalId;

    return Ok({
      id,
      title: "New Link",
      link_type: SharedLinkType.SendTip,
      link_state: SharedLinkState.ChooseType,
      creator,
      asset_info: [],
      max_use: 1n,
      use_count: 0n,
      created_at: tsInNanoSec,
    });
  }

  /**
   * Gets a draft link for the authenticated owner.
   *
   * @param id - Local identifier for the draft link.
   * @returns Draft link when found; otherwise `undefined`.
   */
  getDraftLink(id: string): DraftLink | undefined {
    if (!authState.account) return undefined;
    const links = draftLinkRepository.get(authState.account.owner);
    return links.find((x) => String(x.id) === id);
  }

  /**
   * Updates a draft link in local storage.
   *
   * @param params - Draft link update parameters.
   * @param params.id - Local identifier for the draft link.
   * @param params.updateData - Draft fields to update.
   * @param params.owner - Owner identifier for updating.
   * @returns Nothing.
   */
  update({ id, updateData, owner }: DraftLinkUpdateParams): void {
    draftLinkRepository.update({
      id,
      updateData,
      owner,
    });
  }
}

export const draftLinkService = new DraftLinkService();
