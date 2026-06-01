import { authState } from "$modules/auth/state/auth.svelte";
import {
  draftLinkRepository,
  type DraftLink,
} from "$modules/creationLink/repositories/draftLinkRepository";
import type { GateDraft } from "$modules/gating/types/gate";
import type { LinkStep } from "$modules/links/types/linkStep";
import {
  LinkState as SharedLinkState,
  LinkType as SharedLinkType,
  type AssetInfo as SharedAssetInfo,
  type Link as SharedLink,
} from "$shared";
import { Principal } from "@dfinity/principal";
import { Err, Ok, Result } from "ts-results-es";

/**
 * Service encapsulating the logic to create and manage draft links
 */
export class DraftLinkService {
  /**
   * Create a new draft link for the given principal ID and persist it in the repository
   * @param principalId
   * @returns Result containing the created draft link or an error
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
   * Create a new draft link for the given principal ID
   * @param principalId
   * @returns Result containing the created draft link or an error
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
   * Get a draft link by principal ID and link ID from the repository
   * @param principalId
   * @param id
   * @returns
   */
  getDraftLink(id: string): DraftLink | undefined {
    if (!authState.account) return undefined;
    const links = draftLinkRepository.get(authState.account.owner);
    return links.find((x) => String(x.id) === id);
  }

  /**
   * Update a draft link in local storage
   * @param id local identifier for the draft link
   * @param updateData object containing state and/or createLinkData to update
   * @param principalId owner principal identifier for updating
   * @returns
   */
  update({
    id,
    updateData,
    owner,
  }: {
    id: string;
    updateData: {
      title?: string;
      linkType?: SharedLinkType;
      maxUse?: bigint;
      assetInfo?: SharedAssetInfo[];
      state?: SharedLinkState;
      draftStep?: LinkStep;
      draftGates?: GateDraft[];
    };
    owner: string;
  }) {
    draftLinkRepository.update({
      id,
      updateData,
      owner,
    });
  }
}

export const draftLinkService = new DraftLinkService();
