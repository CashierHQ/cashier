import type { _SERVICE } from "$lib/generated/cashier_backend/cashier_backend.did";
import * as cashierBackend from "$lib/generated/cashier_backend/cashier_backend.did";
import { callCanisterViaIcrc49Raw } from "$modules/auth/services/icrc49";
import { authState } from "$modules/auth/state/auth.svelte";
import type {
  Icrc112ExecutionResult,
  Icrc112RequestInput,
  SignerErrorLike,
} from "$modules/auth/types/icrc112";
import { IDL } from "@icp-sdk/core/candid";
import { Principal } from "@icp-sdk/core/principal";
import type {
  BatchCallCanisterRequest,
  BatchCallCanisterResponse,
  Signer,
  Transport,
} from "@slide-computer/signer";

/**
 * Checks whether a signer error means the ICRC-112 batch call method is not
 * supported by the connected wallet.
 *
 * @param error - Unknown error object returned or thrown by the signer.
 * @returns `true` when the error should fall back to per-call ICRC-49
 * execution.
 */
function isUnsupportedBatchError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const { code, message } = error as SignerErrorLike;
  return (
    code === 3001 ||
    message?.toLowerCase().includes("not supported") === true ||
    message?.toLowerCase().includes("unsupported") === true
  );
}

/**
 * Checks whether a canister method belongs to a known ICRC ledger interface.
 *
 * @param method - Canister method name from an ICRC-112 request.
 * @returns `true` when the method is a known ICRC ledger method.
 */
function isIcrcLedgerMethod(method: string): boolean {
  return (
    method.startsWith("icrc1_") ||
    method.startsWith("icrc2_") ||
    method.startsWith("icrc7_") ||
    method.startsWith("icrc37_")
  );
}

/**
 * Writes a namespaced debug message for ICRC-112 execution diagnostics.
 *
 * @param message - Short debug message.
 * @param details - Optional structured details to include in the log entry.
 * @returns Nothing.
 */
function debugIcrc112(
  message: string,
  details?: Record<string, unknown>,
): void {
  // eslint-disable-next-line no-console
  console.debug(`[ICRC-112] ${message}`, details ?? "");
}

type IcrcLedgerReplyStatus = "success" | "error" | "not-ledger";

/**
 * Service handler for ICRC-112 batch canister call requests.
 *
 * @typeParam T - Transport type used by the connected signer.
 */
class Icrc112Service<T extends Transport> {
  private readonly signer: Signer<T>;

  /**
   * Creates an ICRC-112 service bound to a wallet signer.
   *
   * @param signer - Connected signer used to send JSON-RPC batch requests or
   * ICRC-49 fallback calls.
   */
  constructor(signer: Signer<T>) {
    this.signer = signer;
  }

  /**
   * Sends an ICRC-112 batch canister call request using the connected signer.
   *
   * The input is grouped as sequential batches of parallel requests. When the
   * signer does not support `icrc112_batch_call_canister`, this falls back to
   * executing each constituent request through ICRC-49.
   *
   * @param icrc112Requests - Two-dimensional request list, where each outer
   * item is a sequence step and each inner item can run in parallel.
   * @param sender - Principal text of the user identity that should execute
   * the batch.
   * @param cashierBackendCanisterId - Cashier backend canister ID used for
   * ICRC-114 validation.
   * @returns The result of the ICRC-112 execution, including any per-request
   * errors.
   * @throws If a request is malformed and does not include a canister ID.
   */
  async sendBatchRequest(
    icrc112Requests: Array<Array<Icrc112RequestInput>>,
    sender: string,
    cashierBackendCanisterId: string,
  ): Promise<Icrc112ExecutionResult> {
    const requests = icrc112Requests.map((parallelRequests) =>
      parallelRequests.map((request) => {
        const canisterId = request.canister_id;
        if (!canisterId) {
          throw new Error(
            "ICRC-112 request missing canister_id - malformed request",
          );
        }
        return {
          canisterId: canisterId.toString(),
          method: request.method,
          arg: bytesToBase64(new Uint8Array(request.arg)),
          ...(request.nonce && {
            nonce: bytesToBase64(new Uint8Array(request.nonce)),
          }),
        };
      }),
    );

    const batchRequest: BatchCallCanisterRequest = {
      jsonrpc: "2.0" as const,
      id: `icrc112_batch_${Date.now()}`,
      method: "icrc112_batch_call_canister",
      params: {
        sender,
        requests,
        validationCanisterId: cashierBackendCanisterId,
      },
    };

    try {
      const res = await this.signer.sendRequest<
        BatchCallCanisterRequest,
        BatchCallCanisterResponse
      >(batchRequest);

      if ("error" in res) {
        console.error("ICRC-112 batch request failed:", res.error);
        if (isUnsupportedBatchError(res.error)) {
          return await this.sendBatchRequestViaIcrc49(
            icrc112Requests,
            sender,
            cashierBackendCanisterId,
          );
        }

        return {
          isSuccess: false,
          errors: [res.error ? JSON.stringify(res.error) : "Unknown error"],
        };
      }

      if ("result" in res) {
        let isSuccess = true;
        const errors: string[] = [];

        res.result.responses.forEach(
          (
            sequenceResponses: Array<Record<string, unknown>>,
            sequenceIndex: number,
          ) => {
            sequenceResponses.forEach(
              (
                parallelResponse: Record<string, unknown>,
                parallelIndex: number,
              ) => {
                if (
                  parallelResponse &&
                  typeof parallelResponse === "object" &&
                  "error" in parallelResponse
                ) {
                  const { error } = parallelResponse;
                  console.error(
                    `  ❌ Sequence ${sequenceIndex} Parallel ${parallelIndex} - Error:`,
                    error,
                  );
                  isSuccess = false;
                  errors.push(
                    `Sequence ${sequenceIndex} Parallel ${parallelIndex} Error: ${
                      error ? JSON.stringify(error) : "Unknown error"
                    }`,
                  );
                }
              },
            );
          },
        );

        return { isSuccess, errors: errors.length > 0 ? errors : null };
      }

      return {
        isSuccess: false,
        errors: ["Invalid response structure from signer."],
      };
    } catch (error) {
      console.error("Signer request failed:", error);
      if (isUnsupportedBatchError(error)) {
        return await this.sendBatchRequestViaIcrc49(
          icrc112Requests,
          sender,
          cashierBackendCanisterId,
        );
      }

      return {
        isSuccess: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Builds the cashier backend actor used for ICRC-114 validation.
   *
   * @param cashierBackendCanisterId - Cashier backend canister ID.
   * @returns A typed cashier backend actor.
   * @throws If the authenticated actor cannot be initialized.
   */
  private getValidationActor(cashierBackendCanisterId: string): _SERVICE {
    const actor = authState.buildActor<_SERVICE>({
      canisterId: cashierBackendCanisterId,
      idlFactory: cashierBackend.idlFactory,
    });

    if (!actor) {
      throw new Error("Unable to initialize ICRC-114 validation actor.");
    }

    return actor;
  }

  /**
   * Validates an ICRC-49 fallback reply with the backend ICRC-114 validator.
   *
   * @param cashierBackendCanisterId - Cashier backend canister ID.
   * @param request - Original ICRC-112 request that was executed through
   * ICRC-49.
   * @param replyArg - Raw Candid reply bytes returned by the target canister.
   * @returns `true` when the backend confirms the reply is valid for the
   * request.
   */
  private async validateIcrc114(
    cashierBackendCanisterId: string,
    request: Icrc112RequestInput,
    replyArg: Uint8Array,
  ): Promise<boolean> {
    const actor = this.getValidationActor(cashierBackendCanisterId);

    return await actor.icrc114_validate({
      canister_id: request.canister_id,
      method: request.method,
      arg: new Uint8Array(request.arg),
      res: new Uint8Array(replyArg),
      nonce: request.nonce ? [new Uint8Array(request.nonce)] : [],
    });
  }

  /**
   * Classifies an ICRC ledger reply for fallback execution.
   *
   * Ledger calls can be trusted from their Candid `Result` reply and do not
   * require backend ICRC-114 validation when successful.
   *
   * @param method - Canister method name from the request.
   * @param replyArg - Raw Candid reply bytes returned by the target canister.
   * @returns `success` for successful ledger replies, `error` for ledger
   * errors, or `not-ledger` for methods that require backend validation.
   */
  private getIcrcLedgerReplyStatus(
    method: string,
    replyArg: Uint8Array,
  ): IcrcLedgerReplyStatus {
    if (!isIcrcLedgerMethod(method)) {
      return "not-ledger";
    }

    try {
      const [value] = IDL.decode(
        [IDL.Variant({ Ok: IDL.Reserved, Err: IDL.Reserved })],
        replyArg,
      );

      if (value && typeof value === "object" && "Err" in value) {
        debugIcrc112("ledger reply returned Err", { method });
        return "error";
      }

      debugIcrc112("ledger reply returned Ok", { method });
      return "success";
    } catch {
      // If this cannot be decoded as an Ok/Err variant, it is treated the
      // same way as IIChannel: assume the ICRC ledger call is successful and
      // skip backend ICRC-114 validation for this constituent request.
      debugIcrc112("ledger reply did not decode as Result, assuming success", {
        method,
      });
      return "success";
    }
  }

  /**
   * Executes an ICRC-112 request matrix by issuing each constituent call
   * through ICRC-49.
   *
   * This fallback is used for signers that do not support
   * `icrc112_batch_call_canister`. Ledger calls are classified locally from the
   * Candid reply; non-ledger calls are validated through backend ICRC-114.
   *
   * @param icrc112Requests - Two-dimensional request list, where each outer
   * item is a sequence step and each inner item can run in parallel.
   * @param sender - Principal text of the user identity that should execute
   * the calls.
   * @param cashierBackendCanisterId - Cashier backend canister ID used for
   * ICRC-114 validation.
   * @returns The fallback execution result, including skipped or failed
   * request errors.
   */
  private async sendBatchRequestViaIcrc49(
    icrc112Requests: Array<Array<Icrc112RequestInput>>,
    sender: string,
    cashierBackendCanisterId: string,
  ): Promise<Icrc112ExecutionResult> {
    const senderPrincipal = Principal.fromText(sender);
    const errors: string[] = [];
    let batchFailed = false;

    for (const [sequenceIndex, requests] of icrc112Requests.entries()) {
      for (const [parallelIndex, request] of requests.entries()) {
        const requestLabel = {
          sequenceIndex,
          parallelIndex,
          method: request.method,
          canisterId: request.canister_id.toText(),
        };

        if (batchFailed) {
          errors.push(
            `Sequence ${sequenceIndex} Parallel ${parallelIndex} Error: Request not processed.`,
          );
          continue;
        }

        try {
          debugIcrc112("executing fallback request via ICRC-49", requestLabel);
          const { replyArg } = await callCanisterViaIcrc49Raw(
            this.signer,
            senderPrincipal,
            request.canister_id,
            request.method,
            new Uint8Array(request.arg),
          );
          debugIcrc112("fallback request replied", {
            ...requestLabel,
            replyBytes: replyArg.byteLength,
          });

          const ledgerStatus = this.getIcrcLedgerReplyStatus(
            request.method,
            replyArg,
          );
          if (ledgerStatus === "success") {
            debugIcrc112(
              "skipping backend ICRC-114 validation for ledger call",
              {
                ...requestLabel,
              },
            );
            continue;
          }
          if (ledgerStatus === "error") {
            batchFailed = true;
            errors.push(
              `Sequence ${sequenceIndex} Parallel ${parallelIndex} Error: Ledger call returned Err.`,
            );
            continue;
          }

          debugIcrc112(
            "validating fallback request with ICRC-114",
            requestLabel,
          );
          const isValid = await this.validateIcrc114(
            cashierBackendCanisterId,
            request,
            replyArg,
          );
          debugIcrc112("ICRC-114 validation completed", {
            ...requestLabel,
            isValid,
          });

          if (!isValid) {
            batchFailed = true;
            errors.push(
              `Sequence ${sequenceIndex} Parallel ${parallelIndex} Error: Validation failed.`,
            );
          }
        } catch (error) {
          batchFailed = true;
          errors.push(
            `Sequence ${sequenceIndex} Parallel ${parallelIndex} Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }

    return {
      isSuccess: errors.length === 0,
      errors: errors.length > 0 ? errors : null,
    };
  }
}

export default Icrc112Service;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
