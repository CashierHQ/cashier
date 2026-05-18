import * as cashierBackend from "$lib/generated/cashier_backend/cashier_backend.did";
import type { _SERVICE } from "$lib/generated/cashier_backend/cashier_backend.did";
import { authState } from "$modules/auth/state/auth.svelte";
import { callCanisterViaIcrc49Raw } from "$modules/auth/signer/icrc49";
import { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import type {
  BatchCallCanisterRequest,
  BatchCallCanisterResponse,
  Signer,
  Transport,
} from "@slide-computer/signer";
import { Buffer } from "buffer";
import type { Icrc112ExecutionResult } from "../types/icrc112Request";

type Icrc112RequestInput = {
  canister_id: Principal;
  method: string;
  arg: ArrayBuffer;
  nonce?: ArrayBuffer;
};

type SignerErrorLike = {
  code?: number;
  message?: string;
};

function isUnsupportedBatchError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const { code, message } = error as SignerErrorLike;
  return (
    code === 3001 ||
    message?.toLowerCase().includes("not supported") === true ||
    message?.toLowerCase().includes("unsupported") === true
  );
}

function isIcrcLedgerMethod(method: string): boolean {
  return (
    method.startsWith("icrc1_") ||
    method.startsWith("icrc2_") ||
    method.startsWith("icrc7_") ||
    method.startsWith("icrc37_")
  );
}

function debugIcrc112(message: string, details?: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.debug(`[ICRC-112] ${message}`, details ?? "");
}

type IcrcLedgerReplyStatus = "success" | "error" | "not-ledger";

// Class of service handler for ICRC-112 requests
// T is the Transport type used by the Signer
class Icrc112Service<T extends Transport> {
  private readonly signer: Signer<T>;

  constructor(signer: Signer<T>) {
    this.signer = signer;
  }

  /**
   * Send ICRC-112 batch call request using the connected signer
   * @param icrc112Requests - 2D array of ICRC-112 requests (sequences of parallel requests)
   * @returns The result of the ICRC-112 execution
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
          arg: Buffer.from(request.arg).toString("base64"),
          ...(request.nonce && {
            nonce: Buffer.from(request.nonce).toString("base64"),
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
        validation: {
          canisterId: cashierBackendCanisterId,
          method: "icrc114_validate",
        },
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

  private async validateIcrc114(
    cashierBackendCanisterId: string,
    request: Icrc112RequestInput,
    replyArg: ArrayBuffer,
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

  private getIcrcLedgerReplyStatus(
    method: string,
    replyArg: ArrayBuffer,
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
            request.arg,
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
            debugIcrc112("skipping backend ICRC-114 validation for ledger call", {
              ...requestLabel,
            });
            continue;
          }
          if (ledgerStatus === "error") {
            batchFailed = true;
            errors.push(
              `Sequence ${sequenceIndex} Parallel ${parallelIndex} Error: Ledger call returned Err.`,
            );
            continue;
          }

          debugIcrc112("validating fallback request with ICRC-114", requestLabel);
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
