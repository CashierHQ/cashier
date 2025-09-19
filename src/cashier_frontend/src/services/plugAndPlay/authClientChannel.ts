import {
  type BatchCallCanisterRequest,
  type BatchCallCanisterResponse,
  type CallCanisterRequest,
  type Channel,
  type DelegationRequest,
  fromBase64,
  INVALID_REQUEST_ERROR,
  isJsonRpcRequest,
  type JsonRequest,
  type JsonResponse,
  NOT_SUPPORTED_ERROR,
  toBase64,
} from "@slide-computer/signer";
import { AuthClientTransportError } from "./authClientTransport";
import {
  ICRC_114_METHOD_NAME,
  MAINNET_ROOT_KEY,
  scopes,
  supportedStandards,
} from "./constants";
import { DelegationChain, DelegationIdentity } from "@dfinity/identity";
import {
  Actor,
  Cbor,
  Certificate,
  HttpAgent,
  LookupStatus,
  polling,
  type SignIdentity,
} from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { IDL } from "@dfinity/candid";
import { Icrc114ValidateArgs } from "@/generated/cashier_backend/cashier_backend.did";

/**
 * AuthClientChannel implements the `Channel` contract used by the signer layer.
 *
 * Responsibilities:
 * - Bridge JSON-RPC requests (from signer consumers) to an underlying
 *   `HttpAgent` and translate responses back to JSON-RPC format.
 * - Provide a lightweight event listener model for `response` and `close`
 *   events so callers (for example UI code) can react to replies.
 *
 * Notes:
 * - The channel intentionally ignores one-way requests (requests without an
 *   `id`).
 * - Some request methods (ICRC-related) receive special handling and are
 *   translated into agent calls, read-state checks, delegation creation, or
 *   validation flows.
 */
export class AuthClientChannel implements Channel {
  readonly #agent: HttpAgent;
  readonly #closeListeners = new Set<() => void>();
  readonly #responseListeners = new Set<(response: JsonResponse) => void>();
  #closed: boolean = false;

  constructor(agent: HttpAgent) {
    this.#agent = agent;
  }

  get closed() {
    return this.#closed;
  }

  /**
   * Register an event listener.
   *
   * Supported events:
   * - "close": called with no args when the channel is closed.
   * - "response": called with the JSON-RPC response object whenever a
   *   request (with an `id`) finishes processing.
   *
   * Returns an unsubscribe function that removes the listener when invoked.
   */
  addEventListener(
    ...[event, listener]:
      | [event: "close", listener: () => void]
      | [event: "response", listener: (response: JsonResponse) => void]
  ): () => void {
    switch (event) {
      case "close":
        this.#closeListeners.add(listener);
        return () => {
          this.#closeListeners.delete(listener);
        };
      case "response":
        this.#responseListeners.add(listener);
        return () => {
          this.#responseListeners.delete(listener);
        };
    }
  }

  /**
   * Send a JSON-RPC request through the channel.
   *
   * Behavior:
   * - If the channel is closed, throws an `AgentTransportError`.
   * - One-way requests (no `id`) are ignored.
   * - Otherwise the request is handled by `#createResponse` and every
   *   registered `response` listener is invoked with the resulting
   *   `JsonResponse`.
   *
   * This method never returns a response directly; results are delivered via
   * the `response` listeners to match the `Channel` interface used by the
   * signer layer.
   */
  async send(request: JsonRequest): Promise<void> {
    if (this.closed) {
      throw new AuthClientTransportError("Communication channel is closed");
    }

    // Ignore one way messages
    const id = request.id;
    if (id === undefined) {
      return;
    }

    // Create response and call listeners
    const response = await this.#createResponse({ id, ...request });
    this.#responseListeners.forEach((listener) => listener(response));
  }

  /**
   * Close the channel and notify "close" listeners.
   * After calling `close()` the channel will reject further `send()` calls
   * with an `AgentTransportError`.
   */
  async close(): Promise<void> {
    this.#closed = true;
    this.#closeListeners.forEach((listener) => listener());
  }

  /**
   * Internal request handler that turns an incoming JSON-RPC request into a
   * JSON-RPC response.
   *
   * Inputs:
   * - `request`: a validated JSON-RPC request with a non-null `id`.
   *
   * Outputs:
   * - A `JsonResponse` object which either contains `result` or `error`.
   *
   * Error handling / special cases:
   * - Invalid JSON-RPC requests receive a `INVALID_REQUEST_ERROR` response.
   * - Unsupported methods receive a `NOT_SUPPORTED_ERROR` response.
   * - For batched canister calls (`icrc112_batch_call_canister`) the method
   *   performs per-request validation and returns structured errors when a
   *   per-request validation or execution failure happens.
   *
   * This method is intentionally private. It performs the heavy lifting for
   * mapping ICRC-related helper RPCs to agent operations (delegation
   * creation, call/submit/read-state, validation via an optional
   * validation canister, etc.).
   */
  async #createResponse(
    request: JsonRequest & { id: NonNullable<JsonRequest["id"]> },
  ): Promise<JsonResponse> {
    const id = request.id;

    if (!isJsonRpcRequest(request)) {
      return {
        id,
        jsonrpc: "2.0",
        error: { code: INVALID_REQUEST_ERROR, message: "Invalid request" },
      };
    }

    switch (request.method) {
      case "icrc25_supported_standards":
        return {
          id,
          jsonrpc: "2.0",
          result: { supportedStandards },
        };
      case "icrc25_permissions":
      case "icrc25_request_permissions":
        return {
          id,
          jsonrpc: "2.0",
          result: { scopes },
        };
      case "icrc27_accounts": {
        const owner = (await this.#agent.getPrincipal()).toText();
        return {
          id,
          jsonrpc: "2.0",
          result: {
            accounts: [{ owner }],
          },
        };
      }
      case "icrc34_delegation": {
        const delegationRequest = request as DelegationRequest;
        const identity = this.#agent.config.identity as SignIdentity;
        const delegationChain =
          identity instanceof DelegationIdentity
            ? identity.getDelegation()
            : undefined;
        const expiration = new Date(
          Date.now() +
            Number(
              delegationRequest.params!.maxTimeToLive
                ? BigInt(delegationRequest.params!.maxTimeToLive) /
                    BigInt(1_000_000)
                : BigInt(8) * BigInt(3_600_000),
            ),
        );
        const signedDelegationChain = await DelegationChain.create(
          identity,
          { toDer: () => fromBase64(delegationRequest.params!.publicKey) },
          expiration,
          {
            previous: delegationChain,
            targets: delegationRequest.params!.targets?.map((target) =>
              Principal.fromText(target),
            ),
          },
        );
        return {
          id,
          jsonrpc: "2.0",
          result: {
            publicKey: toBase64(signedDelegationChain.publicKey),
            signerDelegation: signedDelegationChain.delegations.map(
              ({ delegation, signature }) => ({
                delegation: {
                  pubkey: toBase64(delegation.pubkey),
                  expiration: delegation.expiration.toString(),
                  ...(delegation.targets
                    ? {
                        targets: delegation.targets.map((target) =>
                          target.toText(),
                        ),
                      }
                    : {}),
                },
                signature: toBase64(signature),
              }),
            ),
          },
        };
      }
      case "icrc49_call_canister": {
        const callCanisterRequest = request as CallCanisterRequest;
        const { pollForResponse, defaultStrategy } = polling;
        const canisterId = Principal.fromText(
          callCanisterRequest.params!.canisterId,
        );
        if (
          callCanisterRequest.params?.sender !==
          this.#agent.getPrincipal().toString()
        ) {
          throw new AuthClientTransportError(
            "Sender does not match Agent identity",
          );
        }
        const agent = await HttpAgent.from(this.#agent);
        let contentMap: ArrayBuffer;
        agent.addTransform("update", async (agentRequest) => {
          contentMap = Cbor.encode(agentRequest.body);
          return agentRequest;
        });
        const submitResponse = await agent.call(canisterId, {
          effectiveCanisterId: canisterId,
          methodName: callCanisterRequest.params!.method,
          arg: fromBase64(callCanisterRequest.params!.arg),
        });
        await pollForResponse(
          agent,
          canisterId,
          submitResponse.requestId,
          defaultStrategy(),
        );
        const { certificate } = await agent.readState(canisterId, {
          paths: [
            [
              new TextEncoder().encode("request_status").buffer,
              submitResponse.requestId,
            ],
          ],
        });
        return {
          id,
          jsonrpc: "2.0",
          result: {
            contentMap: toBase64(contentMap!),
            certificate: toBase64(certificate),
          },
        };
      }
      case "icrc112_batch_call_canister": {
        const batchCallCanisterRequest = request as BatchCallCanisterRequest;

        // if more than 1 request in batch, validation is required
        if (
          batchCallCanisterRequest.params!.requests.length > 1 &&
          !batchCallCanisterRequest.params?.validation?.canisterId
        ) {
          return {
            id,
            jsonrpc: "2.0",
            error: {
              code: 1002,
              message: "Validation required.",
            },
          };
        }

        const { pollForResponse, defaultStrategy } = polling;
        const validationActor = batchCallCanisterRequest.params?.validation
          ?.canisterId
          ? Actor.createActor(
              ({ IDL }) =>
                IDL.Service({
                  [ICRC_114_METHOD_NAME]: IDL.Func(
                    [
                      IDL.Record({
                        arg: IDL.Vec(IDL.Nat8),
                        res: IDL.Vec(IDL.Nat8),
                        method: IDL.Text,
                        canister_id: IDL.Principal,
                        nonce: IDL.Opt(IDL.Vec(IDL.Nat8)),
                      }),
                    ],
                    [IDL.Bool],
                    [],
                  ),
                }),
              {
                canisterId:
                  batchCallCanisterRequest.params?.validation?.canisterId,
                agent: this.#agent,
              },
            )
          : undefined;
        const batchCallCanisterResponse: BatchCallCanisterResponse = {
          id,
          jsonrpc: "2.0",
          result: {
            responses: [],
          },
        };
        let batchFailed = false;
        for (const requests of batchCallCanisterRequest.params!.requests) {
          batchCallCanisterResponse.result.responses.push(
            await Promise.all(
              requests.map(async (request) => {
                if (batchFailed) {
                  return {
                    error: {
                      code: 1001,
                      message: "Request not processed.",
                    },
                  };
                }
                try {
                  const canisterId = Principal.fromText(request.canisterId);
                  const agent = await HttpAgent.from(this.#agent);
                  let contentMap: ArrayBuffer =
                    undefined as unknown as ArrayBuffer;
                  agent.addTransform("update", async (agentRequest) => {
                    contentMap = Cbor.encode(agentRequest.body);
                    return agentRequest;
                  });
                  const submitResponse = await agent.call(canisterId, {
                    effectiveCanisterId: canisterId,
                    methodName: request.method,
                    arg: fromBase64(request.arg),
                  });
                  await pollForResponse(
                    agent,
                    canisterId,
                    submitResponse.requestId,
                    defaultStrategy(),
                  );
                  const { certificate } = await agent.readState(canisterId, {
                    paths: [
                      [
                        new TextEncoder().encode("request_status").buffer,
                        submitResponse.requestId,
                      ],
                    ],
                  });
                  const validCertificate = await Certificate.create({
                    certificate,
                    rootKey: agent.rootKey ?? MAINNET_ROOT_KEY,
                    canisterId,
                  });
                  const status = validCertificate.lookup([
                    "request_status",
                    submitResponse.requestId,
                    "status",
                  ]);
                  const reply = validCertificate.lookup([
                    "request_status",
                    submitResponse.requestId,
                    "reply",
                  ]);
                  if (
                    status.status !== LookupStatus.Found ||
                    new TextDecoder().decode(status.value as ArrayBuffer) !==
                      "replied" ||
                    reply.status !== LookupStatus.Found
                  ) {
                    batchFailed = true;
                    return {
                      error: {
                        code: 4000,
                        message: "Certificate is missing reply.",
                      },
                    };
                  }
                  console.log("reqeust:", request);
                  if (
                    request.method.startsWith("icrc1_") ||
                    request.method.startsWith("icrc2_") ||
                    request.method.startsWith("icrc7_") ||
                    request.method.startsWith("icrc37_")
                  ) {
                    // Built in validation, basically checks if variant with Err is returned
                    try {
                      const value = IDL.decode(
                        [IDL.Variant({ Err: IDL.Reserved })],
                        reply.value as ArrayBuffer,
                      );
                      console.log("[Decoded value for validation:]", value);
                      if ("Err" in value) {
                        batchFailed = true;
                        return {
                          error: {
                            code: 1003,
                            message: "Validation failed.",
                          },
                        };
                      }
                    } catch {
                      // If this return error likely the response is not included Err variant
                      // so we can assume it's valid
                      return {
                        result: {
                          contentMap: toBase64(contentMap!),
                          certificate: toBase64(certificate),
                        },
                      };
                    }
                  }

                  if (validationActor) {
                    const icrc114Args: Icrc114ValidateArgs = {
                      canister_id: Principal.fromText(request.canisterId),
                      method: request.method,
                      arg: new Uint8Array(fromBase64(request.arg)),
                      res: new Uint8Array(reply.value as ArrayBuffer),
                      nonce: request.nonce
                        ? [new Uint8Array(fromBase64(request.nonce))]
                        : [],
                    };

                    console.log("ICRC-114 validation args:", icrc114Args);

                    const isValid =
                      await validationActor[ICRC_114_METHOD_NAME](icrc114Args);

                    console.log("Validation result:", isValid);

                    if (!isValid) {
                      batchFailed = true;
                      return {
                        error: {
                          code: 1003,
                          message: "Validation failed.",
                        },
                      };
                    }
                  }
                  return {
                    result: {
                      contentMap: toBase64(contentMap!),
                      certificate: toBase64(certificate),
                    },
                  };
                } catch (error) {
                  console.error("Error processing request:", error);
                  batchFailed = true;
                  return {
                    error: {
                      code: 4000,
                      message: "Request failed.",
                      data: error instanceof Error ? error.message : undefined,
                    },
                  };
                }
              }),
            ),
          );
        }
        return batchCallCanisterResponse;
      }
      default:
        return {
          id,
          jsonrpc: "2.0",
          error: { code: NOT_SUPPORTED_ERROR, message: "Not supported" },
        };
    }
  }
}
