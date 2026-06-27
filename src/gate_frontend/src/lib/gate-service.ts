import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "$lib/generated/gate_service/gate_service.did.js";
import type {
  _SERVICE,
  XTokenExchangeResult,
} from "$lib/generated/gate_service/gate_service.did.d.ts";
import { GATE_SERVICE_CANISTER_ID, HOST_ICP } from "$lib/constants";

function buildAnonActor(): _SERVICE {
  const shouldFetchRootKey = HOST_ICP.includes("localhost");
  const agent = HttpAgent.createSync({ host: HOST_ICP });
  if (shouldFetchRootKey) {
    agent.fetchRootKey().catch(console.error);
  }
  return Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: GATE_SERVICE_CANISTER_ID,
  });
}

/**
 * Exchanges an X OAuth authorization code for the user's X profile and access token
 * by calling the gate_service canister with an anonymous identity.
 */
export async function exchangeXToken(
  code: string,
): Promise<XTokenExchangeResult> {
  const actor = buildAnonActor();
  const result = await actor.exchange_x_token(code);
  if ("Ok" in result) return result.Ok;
  throw new Error(`Gate service error: ${JSON.stringify(result.Err)}`);
}
