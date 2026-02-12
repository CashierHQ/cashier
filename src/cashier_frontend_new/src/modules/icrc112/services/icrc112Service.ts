import { Principal } from "@dfinity/principal";
import type {
  BatchCallCanisterRequest,
  BatchCallCanisterResponse,
  Signer,
  Transport,
} from "@slide-computer/signer";
import { Buffer } from "buffer";
import type {
  Icrc112Error,
  Icrc112ExecutionResult,
} from "../types/icrc112Request";
import type { IcrcErrorData } from "$modules/auth/signer/icrc-parser";

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
          errors: [
            {
              message: res.error
                ? JSON.stringify(res.error)
                : "Unknown error",
              data: null,
            },
          ],
        };
      }

      if ("result" in res) {
        let isSuccess = true;
        const errors: Icrc112Error[] = [];

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
                  const err = parallelResponse.error as {
                    code?: number;
                    message?: string;
                    data?: IcrcErrorData;
                  } | null;
                  console.error(
                    `  ❌ Sequence ${sequenceIndex} Parallel ${parallelIndex} - Error:`,
                    err,
                  );
                  isSuccess = false;
                  errors.push({
                    message: `Seq ${sequenceIndex} Par ${parallelIndex}: ${err?.message ?? "Unknown"}`,
                    data:
                      err?.code === 1003
                        ? (err.data as IcrcErrorData) ?? null
                        : null,
                  });
                }
              },
            );
          },
        );

        return { isSuccess, errors: errors.length > 0 ? errors : null };
      }

      return {
        isSuccess: false,
        errors: [
          { message: "Invalid response structure from signer.", data: null },
        ],
      };
    } catch (error) {
      console.error("Signer request failed:", error);
      return {
        isSuccess: false,
        errors: [
          {
            message:
              error instanceof Error ? error.message : String(error),
            data: null,
          },
        ],
      };
    }
  }
}

export default Icrc112Service;
