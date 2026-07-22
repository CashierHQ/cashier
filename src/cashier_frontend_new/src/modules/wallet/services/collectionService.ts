import * as tokenStorage from "$lib/generated/token_storage/token_storage.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { TOKEN_STORAGE_CANISTER_ID } from "$modules/shared/constants";
import {
  CollectionMapper,
  type CollectionSummary,
} from "$modules/wallet/types/nft";
import { Principal } from "@icp-sdk/core/principal";

/**
 * Service for interacting with the Token Storage canister's NFT collection registry.
 */
class CollectionService {
  /**
   * Get the authenticated Token Storage actor for the current user.
   * @returns The authenticated Token Storage actor, or null if not authenticated.
   */
  #getActor(): tokenStorage._SERVICE | null {
    return authState.buildActor({
      canisterId: TOKEN_STORAGE_CANISTER_ID,
      idlFactory: tokenStorage.idlFactory,
    });
  }

  /**
   * Get the anonymous Token Storage actor (no authentication required).
   * Used for public read-only queries on the collection registry.
   */
  #getAnonymousActor(): tokenStorage._SERVICE {
    return authState.buildActor({
      canisterId: TOKEN_STORAGE_CANISTER_ID,
      idlFactory: tokenStorage.idlFactory,
      options: { anonymous: true },
    }) as tokenStorage._SERVICE;
  }

  /**
   * List a page of collections from the registry. Uses an anonymous actor since the
   * registry is public.
   * @param start pagination offset
   * @param limit maximum number of collections to return
   * @returns Page of collection summaries
   */
  public async listCollections(
    start: number,
    limit: number,
  ): Promise<CollectionSummary[]> {
    const actor = this.#getAnonymousActor();
    const res = await actor.list_collections({
      start: [start],
      limit: [limit],
    });
    return res.map(CollectionMapper.fromCollectionDto);
  }

  /**
   * Get the ids of the collections enabled by the current user.
   * @returns Set of enabled collection ids (as text)
   * @throws Error if the user is not authenticated
   */
  public async getEnabledCollectionIds(): Promise<Set<string>> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    const res = await actor.user_get_enabled_collections();
    return new Set(res.map((principal) => principal.toText()));
  }

  /**
   * Enable or disable a collection for the current user.
   * @param collectionId collection canister id
   * @param isEnabled the new enabled state
   * @throws Error if the user is not authenticated or the update fails
   */
  public async setCollectionEnabled(
    collectionId: Principal,
    isEnabled: boolean,
  ): Promise<void> {
    const actor = this.#getActor();
    if (!actor) {
      throw new Error("User is not authenticated");
    }
    const res = await actor.user_enable_collection({
      collection_id: collectionId,
      is_enabled: isEnabled,
    });
    if ("Err" in res) {
      throw new Error(`Error updating collection: ${JSON.stringify(res.Err)}`);
    }
  }
}

export const collectionService = new CollectionService();
