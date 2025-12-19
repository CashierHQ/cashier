import { Principal } from "@dfinity/principal";
import type {
  BatchCallCanisterRequest,
  BatchCallCanisterResponse,
  Signer,
  Transport,
} from "@slide-computer/signer";
import { Buffer } from "buffer";
import type { Icrc112ExecutionResult } from "../types/icrc112Request";

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
    icrc112Requests: Array<
      Array<{
        canister_id: Principal;
        method: string;
        arg: ArrayBuffer;
        nonce?: ArrayBuffer;
      }>
    >,
    sender: string,
    cashierBackendCanisterId: string,
  ): Promise<Icrc112ExecutionResult> {
    const requests = icrc112Requests.map((parallelRequests) =>
      parallelRequests.map((request) => ({
        canisterId: request.canister_id.toString(),
        method: request.method,
        arg: Buffer.from(request.arg).toString("base64"),
        ...(request.nonce && {
          nonce: Buffer.from(request.nonce).toString("base64"),
        }),
      })),
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
    }
  }
}

export default Icrc112Service;
