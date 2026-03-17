import { Actor, type HttpAgent } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import { authState } from "$modules/auth/auth-state.svelte";

// Create an actor for a given canister. Returns null if no agent available.
export function createActor<T>(
  canisterId: string,
  idlFactory: IDL.InterfaceFactory,
  options?: { anonymous?: boolean },
): T | null {
  const agent: HttpAgent | null = options?.anonymous
    ? authState.buildAnonymousAgent()
    : authState.getAgent();

  if (!agent) return null;

  return Actor.createActor<T>(idlFactory, { agent, canisterId });
}
