import { Agent } from "@dfinity/agent";
import { CallCanisterResponse } from "../types/callCanister.service.types";
import { callCanisterService } from "./callCanister.service";

/* Define types */
export interface ICRC112Request {
    canisterId: string;
    method: string;
    arg: string;
    nonce?: string;
}

export type ParallelRequests = Array<ICRC112Request>;

/**
 * Each sub array will execute in parallel and the next sub array will execute after the previous one is completed.
 */
export type SequenceRequest = Array<ParallelRequests>;

export type Icrc112Requests = SequenceRequest;

export interface CallCanisterRequest {
    jsonrpc: string;
    method: string;
    params: {
        sender: string;
        requests: SequenceRequest;
        validation?: {
            canisterId: string;
            method: string;
        };
    };
}

interface SuccessResponse {
    result: CallCanisterResponse;
}

interface ErrorResponse {
    error: {
        code: number;
        message: string;
        data?: unknown;
    };
}

export interface CanisterValidation {
    canisterId: string;
    method: string;
}

export const SUPPORTED_PARSED_METHODS = ["icrc1_transfer", "icrc2_approve", "icrc7_transfer"];

export type Icrc112ResponseItem = SuccessResponse | ErrorResponse;

export interface Icrc112Response {
    responses: Icrc112ResponseItem[][];
}

export class ICRC112Service {
    static async icrc112Execute(input: Icrc112Requests, agent: Agent): Promise<Icrc112Response> {
        const arg = {
            jsonrpc: "2.0",
            method: this.getMethod(),
            params: {
                sender: (await agent.getPrincipal()).toString(),
                requests: input,
                validation: {
                    canisterId: "canisterId",
                    method: "validate",
                },
            },
        };

        const finalResponse: Icrc112Response = { responses: [] };

        for (let i = 0; i < arg.params.requests.length; i++) {
            const parallelRequests = arg.params.requests[i];
            const parallelResponses = await this.parallelExecuteIcrcRequests(
                parallelRequests,
                agent,
            );

            //Process each response from batch call and map them to schema, Map them to "SuccessResponse" or "ErrorResponse"
            const icrc112ResponseItems: Icrc112ResponseItem[] = this.processResponse(
                parallelResponses,
                parallelRequests,
            );

            finalResponse.responses.push(icrc112ResponseItems);
        }
        return finalResponse;
    }

    private static processResponse(
        response: Array<Icrc112ResponseItem>,
        parallelRequest: ParallelRequests,
        canisterValidation?: CanisterValidation,
    ): Icrc112ResponseItem[] {
        const responses: Icrc112ResponseItem[] = [];
        response.forEach((response, index) => {
            // If no response received
            if (!response) {
                responses.push({
                    error: {
                        code: 1000,
                        message: "No response from canister",
                    },
                });
                return;
            }

            // Start ICRC-114
            //TODO: Complete ICRC-114 with canister validation after refinement
            if (canisterValidation) {
                // Check method name to decide parse response in wallet or validate canister
                if (SUPPORTED_PARSED_METHODS.includes(parallelRequest[index].method)) {
                    console.log("Parse response inside wallet, then process parsed response");
                } else {
                    console.log("Validate response by validate canister");
                }
                // End ICRC-114
            } else {
                if ("result" in response) {
                    responses.push({ result: response.result });
                } else {
                    responses.push({ error: response.error });
                }
            }
        });
        return responses;
    }

    private static async parallelExecuteIcrcRequests(
        requests: ParallelRequests,
        agent: Agent,
    ): Promise<Array<Icrc112ResponseItem>> {
        const process_tasks: Promise<CallCanisterResponse>[] = [];
        const responses: Array<Icrc112ResponseItem> = [];

        requests.forEach((request) => {
            const task = callCanisterService.call({
                canisterId: request.canisterId,
                calledMethodName: request.method,
                parameters: request.arg,
                agent: agent,
            });
            process_tasks.push(task);
        });
        const results = await Promise.allSettled(process_tasks);
        // Process each result
        results.forEach((result) => {
            if (result.status === "fulfilled") {
                const response: CallCanisterResponse = result.value;
                responses.push({ result: response });
            } else if (result.status === "rejected") {
                const error = result.reason;
                responses.push({
                    error: {
                        code: 1000,
                        message: error.message,
                    },
                });
            }
        });
        return responses;
    }

    private static getMethod(): string {
        return "icrc_112_batch_call_canister";
    }
}
