import { Buffer } from "buffer";
import { Principal } from "@dfinity/principal";
import type {
  BatchCallCanisterRequest,
  BatchCallCanisterResponse,
  Signer,
  Transport,
} from "@slide-computer/signer";
import { Err, Ok, type Result } from "ts-results-es";

class Icrc112Service<T extends Transport> {
  private readonly signer: Signer<T>;

  constructor(signer: Signer<T>) {
    this.signer = signer;
  }

  /**
   * Send ICRC-112 batch call request using the connected signer
   * @param icrc112Requests - 2D array of ICRC-112 requests (sequences of parallel requests)
   * @returns Promise that resolves when the batch request
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
  ): Promise<Result<void, Error>> {
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
        return Err(
          new Error(
            `Batch request failed: ${res.error.message} (Code: ${res.error.code})`,
          ),
        );
      }

      if ("result" in res) {
        res.result.responses.forEach(
          (
            sequenceResponses: Array<Record<string, unknown>>,
            sequenceIndex: number,
          ) => {
            console.log(
              `Sequence ${sequenceIndex} responses:`,
              sequenceResponses.length,
            );

            sequenceResponses.forEach(
              (
                parallelResponse: Record<string, unknown>,
                parallelIndex: number,
              ) => {
                if (
                  typeof parallelResponse === "object" &&
                  parallelResponse !== null &&
                  "result" in parallelResponse
                ) {
                  const resObj = parallelResponse as {
                    result: {
                      contentMap?: unknown;
                      certificate?: { length?: number };
                    };
                  };
                  console.log(`  ✅ Parallel ${parallelIndex} - Success:`, {
                    contentMap: resObj.result.contentMap,
                    certificateLength: resObj.result.certificate?.length,
                  });
                } else if (
                  typeof parallelResponse === "object" &&
                  parallelResponse !== null &&
                  "error" in parallelResponse
                ) {
                  const errObj = parallelResponse as { error?: unknown };
                  console.error(
                    `  ❌ Parallel ${parallelIndex} - Error:`,
                    errObj.error,
                  );
                }
              },
            );
          },
        );

        return Ok(undefined);
      }

      return Err(
        new Error(
          "Invalid response format: missing both result and error properties",
        ),
      );
    } catch (error) {
      console.error("Signer request failed:", error);
      return Err(
        new Error(
          `Signer request failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }
}

export default Icrc112Service;
