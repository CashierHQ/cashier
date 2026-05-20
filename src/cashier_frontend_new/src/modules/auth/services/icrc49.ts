import { MAINNET_ROOT_KEY } from "$modules/auth/signer/ii/constants";
import type {
  Icrc49Bytes,
  Icrc49ContentMap,
  Icrc49RawCallResult,
} from "$modules/auth/types/icrc49";
import {
  Cbor,
  Certificate,
  LookupPathStatus,
  requestIdOf,
} from "@icp-sdk/core/agent";
import { IDL } from "@icp-sdk/core/candid";
import { Principal } from "@icp-sdk/core/principal";
import type { Signer } from "@slide-computer/signer";

/**
 * Calls a canister through an ICRC-49 wallet signer and decodes the Candid
 * response.
 *
 * The wallet popup receives the request, shows the user an approval dialog,
 * executes the call with the user's full identity, and returns the result.
 * This is used for token transfers where the target canister is not in the
 * ICRC-34 delegation targets.
 *
 * @typeParam R - Expected decoded Candid return value type.
 * @param signer - Wallet signer that implements the ICRC-49 `callCanister`
 * request.
 * @param sender - Principal of the user identity that should submit the
 * canister call.
 * @param canisterId - Principal of the target canister.
 * @param method - Name of the canister method to call.
 * @param argTypes - Candid argument type definitions used to encode
 * `argValue`.
 * @param retTypes - Candid return type definitions used to decode the reply
 * argument.
 * @param argValue - JavaScript value to encode as the canister call argument.
 * @returns The first decoded Candid return value, typed as `R`.
 */
export async function callCanisterViaIcrc49<R>(
  signer: Signer,
  sender: Principal,
  canisterId: Principal,
  method: string,
  argTypes: IDL.Type[],
  retTypes: IDL.Type[],
  argValue: unknown,
): Promise<R> {
  const encodedArg = IDL.encode(argTypes, [argValue]);

  const { replyArg } = await callCanisterViaIcrc49Raw(
    signer,
    sender,
    canisterId,
    method,
    encodedArg,
  );

  const [result] = IDL.decode(retTypes, replyArg);
  return result as R;
}

/**
 * Calls a canister through an ICRC-49 wallet signer and returns the raw
 * response data.
 *
 * This function is useful when the caller already has a Candid-encoded
 * argument or needs access to the returned content map and certificate in
 * addition to the reply argument.
 *
 * @param signer - Wallet signer that implements the ICRC-49 `callCanister`
 * request.
 * @param sender - Principal of the user identity that should submit the
 * canister call.
 * @param canisterId - Principal of the target canister.
 * @param method - Name of the canister method to call.
 * @param arg - Candid-encoded argument bytes for the canister method.
 * @returns The signer content map, certificate, and extracted reply argument.
 * @throws If the signer response does not contain a direct or certified reply.
 */
export async function callCanisterViaIcrc49Raw(
  signer: Signer,
  sender: Principal,
  canisterId: Principal,
  method: string,
  arg: Icrc49Bytes,
): Promise<Icrc49RawCallResult> {
  const argBytes = toUint8Array(arg);
  const { contentMap, certificate } = await signer.callCanister({
    canisterId,
    sender,
    method,
    arg: argBytes,
  });

  const replyArg = await getReplyArg(contentMap, certificate, canisterId);
  if (!replyArg) {
    throw new Error(`ICRC-49 ${method}: no reply in response`);
  }

  return { contentMap, certificate, replyArg };
}

/**
 * Extracts the reply argument from an ICRC-49 signer response.
 *
 * Some signers include the reply directly in the CBOR content map. Others only
 * return a certificate, so this verifies the certified request status and reads
 * the reply from the certificate tree.
 *
 * @param contentMap - CBOR-encoded call content returned by the signer.
 * @param certificate - Certificate bytes returned by the signer.
 * @param canisterId - Principal of the canister that produced the certificate.
 * @returns The raw Candid reply argument when the call reached `replied`
 * status, otherwise `undefined`.
 */
async function getReplyArg(
  contentMap: Uint8Array,
  certificate: Uint8Array,
  canisterId: Principal,
): Promise<Uint8Array | undefined> {
  const decodedContentMap = Cbor.decode<
    Icrc49ContentMap & Record<string, unknown>
  >(contentMap);
  // Some ICRC-49 signers return the reply directly in contentMap.
  if (decodedContentMap.reply?.arg) {
    return toUint8Array(decodedContentMap.reply.arg);
  }

  const requestId = requestIdOf(
    normalizeCallRequestForRequestId(decodedContentMap),
  );

  const validCertificate = await Certificate.create({
    certificate,
    rootKey: MAINNET_ROOT_KEY,
    principal: { canisterId },
  });

  const status = validCertificate.lookup_path([
    "request_status",
    requestId,
    "status",
  ]);
  const reply = validCertificate.lookup_path([
    "request_status",
    requestId,
    "reply",
  ]);

  if (
    status.status !== LookupPathStatus.Found ||
    new TextDecoder().decode(status.value) !== "replied" ||
    reply.status !== LookupPathStatus.Found
  ) {
    return undefined;
  }

  return reply.value;
}

/**
 * Normalizes decoded ICRC-49 call content before computing its request ID.
 *
 * The request ID algorithm expects `ingress_expiry` to be a `bigint`. CBOR
 * decoders can represent large integers as decimal-like objects, so this
 * converts compatible values before passing the object to `requestIdOf`.
 *
 * @param contentMap - Decoded ICRC-49 call content map.
 * @returns A shallow copy of the content map with `ingress_expiry` normalized
 * when needed.
 */
function normalizeCallRequestForRequestId(
  contentMap: Icrc49ContentMap & Record<string, unknown>,
): Record<string, unknown> {
  const normalized = { ...contentMap };
  const { ingress_expiry } = normalized;

  if (
    ingress_expiry &&
    typeof ingress_expiry === "object" &&
    "toFixed" in ingress_expiry &&
    typeof ingress_expiry.toFixed === "function"
  ) {
    const normalizedIngressExpiry = BigInt(ingress_expiry.toFixed());
    normalized.ingress_expiry = normalizedIngressExpiry;
  }

  return normalized;
}

function toUint8Array(bytes: Icrc49Bytes): Uint8Array {
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}
