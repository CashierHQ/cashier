import * as ext from "$lib/generated/ext/ext.did";
import type { User } from "$lib/generated/ext/ext.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { encodeExtTokenIdentifier } from "$modules/wallet/utils/extTokenIdentifier";
import { Principal } from "@icp-sdk/core/principal";
import { Err, Ok, type Result } from "ts-results-es";

/**
 * Service for interacting with a specific EXT NFT collection canister.
 */
export class ExtService {
  #canisterId: string;

  constructor(collectionId: string) {
    this.#canisterId = collectionId;
  }

  #getActor(): ext._SERVICE | null {
    return authState.buildActor({
      canisterId: this.#canisterId,
      idlFactory: ext.idlFactory,
    });
  }

  public async transfer(
    tokenId: bigint,
    to: { principal: Principal } | { address: string },
  ): Promise<Result<bigint, string>> {
    const actor = this.#getActor();
    const owner = authState.account?.owner;
    if (!actor || !owner) {
      return Err("User is not authenticated");
    }

    const tokenIndex = Number(tokenId);
    if (!Number.isSafeInteger(tokenIndex) || tokenIndex < 0) {
      return Err("Invalid EXT token id");
    }

    const response = await actor.ext_transfer({
      to: to as User,
      from: { principal: Principal.fromText(owner) } as User,
      token: encodeExtTokenIdentifier(this.#canisterId, tokenIndex),
      notify: false,
      subaccount: [],
      memo: [],
      amount: 1n,
    });

    if ("ok" in response) {
      return Ok(response.ok);
    }

    return Err(mapExtTransferError(response.err));
  }
}

function mapExtTransferError(
  error: Extract<ext.TransferResponse, { err: unknown }>["err"],
): string {
  if ("CannotNotify" in error) {
    return `Cannot notify recipient: ${error.CannotNotify}`;
  }
  if ("InsufficientBalance" in error) {
    return "Insufficient balance";
  }
  if ("InvalidToken" in error) {
    return `Invalid token: ${error.InvalidToken}`;
  }
  if ("Rejected" in error) {
    return "Transfer rejected";
  }
  if ("Unauthorized" in error) {
    return `Unauthorized transfer from ${error.Unauthorized}`;
  }
  return error.Other;
}
