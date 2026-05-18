import { Cbor, Certificate, LookupStatus, requestIdOf } from "@dfinity/agent";
import { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import type { Signer } from "@slide-computer/signer";
import { MAINNET_ROOT_KEY } from "./ii/constants";

type Icrc49ContentMap = {
  reply?: {
    arg?: ArrayBuffer;
  };
  ingress_expiry?: unknown;
};

const ICRC49_DEBUG = true;

function debugIcrc49(message: string, details?: Record<string, unknown>): void {
  if (!ICRC49_DEBUG) return;
  // eslint-disable-next-line no-console
  console.debug(`[ICRC-49] ${message}`, details ?? "");
}

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
    debugIcrc49("normalized ingress_expiry for request id", {
      ingressExpiry: normalizedIngressExpiry.toString(),
    });
  }

  return normalized;
}

async function getReplyArg(
  contentMap: ArrayBuffer,
  certificate: ArrayBuffer,
  canisterId: Principal,
): Promise<ArrayBuffer | undefined> {
  const decodedContentMap = Cbor.decode<Icrc49ContentMap & Record<string, unknown>>(
    contentMap,
  );
  debugIcrc49("decoded contentMap", {
    keys: Object.keys(decodedContentMap),
    hasInlineReply: Boolean(decodedContentMap.reply?.arg),
    certificateBytes: certificate.byteLength,
  });

  // Some ICRC-49 signers return the reply directly in contentMap.
  if (decodedContentMap.reply?.arg) {
    debugIcrc49("using inline contentMap reply", {
      replyBytes: decodedContentMap.reply.arg.byteLength,
    });
    return decodedContentMap.reply.arg;
  }

  const requestId = requestIdOf(normalizeCallRequestForRequestId(decodedContentMap));
  debugIcrc49("derived request id", {
    requestId: Array.from(new Uint8Array(requestId))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(""),
  });

  const validCertificate = await Certificate.create({
    certificate,
    rootKey: MAINNET_ROOT_KEY,
    canisterId,
  });

  const status = validCertificate.lookup([
    "request_status",
    requestId,
    "status",
  ]);
  const reply = validCertificate.lookup(["request_status", requestId, "reply"]);
  debugIcrc49("certificate lookup", {
    status: status.status,
    statusText:
      status.status === LookupStatus.Found
        ? new TextDecoder().decode(status.value as ArrayBuffer)
        : undefined,
    reply: reply.status,
    replyBytes:
      reply.status === LookupStatus.Found
        ? (reply.value as ArrayBuffer).byteLength
        : undefined,
  });

  if (
    status.status !== LookupStatus.Found ||
    new TextDecoder().decode(status.value as ArrayBuffer) !== "replied" ||
    reply.status !== LookupStatus.Found
  ) {
    return undefined;
  }

  return reply.value as ArrayBuffer;
}

export type Icrc49RawCallResult = {
  contentMap: ArrayBuffer;
  certificate: ArrayBuffer;
  replyArg: ArrayBuffer;
};

export async function callCanisterViaIcrc49Raw(
  signer: Signer,
  sender: Principal,
  canisterId: Principal,
  method: string,
  arg: ArrayBuffer,
): Promise<Icrc49RawCallResult> {
  const { contentMap, certificate } = await signer.callCanister({
    canisterId,
    sender,
    method,
    arg,
  });

  const replyArg = await getReplyArg(contentMap, certificate, canisterId);
  if (!replyArg) {
    throw new Error(`ICRC-49 ${method}: no reply in response`);
  }

  return { contentMap, certificate, replyArg };
}

/**
 * Make an ICRC-49 canister call through the wallet signer.
 *
 * The wallet popup receives the request, shows the user an approval dialog,
 * executes the call with the user's full identity, and returns the result.
 * This is used for token transfers where the target canister is not in the
 * ICRC-34 delegation targets.
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
