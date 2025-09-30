import * as icpSwapIndexNode from "$lib/generated/icpswap/icpswapNodeIndex";
import { authState } from "$modules/auth/state/auth.svelte";
import { FEATURE_FLAGS, HOST_ICP } from "$modules/shared/constants";
import { ICPSWAP_INDEX_CANISTER_ID } from "$modules/token/constants";
import type { ActorSubclass } from "@dfinity/agent";
import { Actor, HttpAgent } from "@dfinity/agent";
import { accountState } from "./auth.svelte";

// Exported actor state with get/set
export const actorState = {
  // Return token index node actor - automatically uses account if available
  get tokenIndexNodeActor(): ActorSubclass<icpSwapIndexNode._SERVICE> {
    if (authState.pnp) {
      if (accountState.account) {
        // Create actor with identity if account exists
        return authState.pnp.getActor({
          canisterId: ICPSWAP_INDEX_CANISTER_ID,
          idl: icpSwapIndexNode.idlFactory,
        }) as ActorSubclass<icpSwapIndexNode._SERVICE>;
      } else {
        // Create anonymous actor if no account
        return authState.pnp.getActor({
          canisterId: ICPSWAP_INDEX_CANISTER_ID,
          idl: icpSwapIndexNode.idlFactory,
          anon: true,
        }) as ActorSubclass<icpSwapIndexNode._SERVICE>;
      }
    } else {
      // Fallback to anonymous actor if PNP not initialized
      const anonymousAgent = HttpAgent.createSync({
        host: HOST_ICP,
        shouldFetchRootKey: FEATURE_FLAGS.LOCAL_IDENTITY_PROVIDER_ENABLED,
      });
      return Actor.createActor(icpSwapIndexNode.idlFactory, {
        agent: anonymousAgent,
        canisterId: ICPSWAP_INDEX_CANISTER_ID,
      }) as ActorSubclass<icpSwapIndexNode._SERVICE>;
    }
  },
};
