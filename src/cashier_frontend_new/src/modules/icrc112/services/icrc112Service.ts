import { Principal } from "@icp-sdk/core/principal";
import {
  type BatchCallCanisterRequest,
  type BatchCallCanisterResponse,
  type Signer,
  type Transport,
  toBase64,
} from "@slide-computer/signer";
import type {
  Icrc112ExecutionResult,
  OnRequestSettled,
} from "$modules/icrc112/types/icrc112Request";
import { hasBatchProgress } from "$modules/icrc112/utils/hasBatchProgress";

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
   * @param sender - Principal text of the sender
   * @param cashierBackendCanisterId - Canister id used for ICRC-114 validation
   * @param onRequestSettled - Optional callback invoked as each individual sub-request settles
   * @returns The result of the ICRC-112 execution
   */
  async sendBatchRequest(
    icrc112Requests: Array<
      Array<{
        canister_id: Principal;
        method: string;
        arg: Uint8Array | ArrayBuffer;
        nonce?: Uint8Array | ArrayBuffer;
        intentIds?: string[];
      }>
    >,
    sender: string,
    cashierBackendCanisterId: string,
    onRequestSettled?: OnRequestSettled,
  ): Promise<Icrc112ExecutionResult> {
    const requests = icrc112Requests.map((parallelRequests) =>
      parallelRequests.map((request) => {
        const canisterId = request.canister_id;
        if (!canisterId) {
          throw new Error(
            "ICRC-112 request missing canister_id - malformed request",
          );
        }
        // v5: use signer's toBase64 (browser-native, no Buffer polyfill needed)
        return {
          canisterId: canisterId.toString(),
          method: request.method,
          arg: toBase64(new Uint8Array(request.arg)),
          ...(request.nonce && {
            nonce: toBase64(new Uint8Array(request.nonce)),
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
        // v5: validation canister id is a flat field (was nested object)
        validationCanisterId: cashierBackendCanisterId,
      },
    };

    const intentIdsByPosition = icrc112Requests.map((group) =>
      group.map((r) => r.intentIds ?? []),
    );

    let unsubscribeBatchProgress: (() => void) | undefined;
    if (onRequestSettled) {
      const channel = await this.signer.openChannel();
      if (hasBatchProgress(channel)) {
        unsubscribeBatchProgress = channel.onBatchProgress(
          ({ sequenceIndex, parallelIndex, response }) => {
            const intentIds =
              intentIdsByPosition[sequenceIndex]?.[parallelIndex] ?? [];
            const success = "result" in response;
            const error =
              "error" in response ? JSON.stringify(response.error) : undefined;
            onRequestSettled(intentIds, success, error);
          },
        );
      }
    }

    try {
      const res = await this.signer.sendRequest<
        BatchCallCanisterRequest,
        BatchCallCanisterResponse
      >(batchRequest);

      if ("error" in res) {
        console.error("ICRC-112 batch request failed:", res.error);
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
      return {
        isSuccess: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    } finally {
      unsubscribeBatchProgress?.();
    }
  }
}

export default Icrc112Service;
