import { Agent } from "@dfinity/agent";
import { CallCanisterResponse } from "../types/callCanister.service.types";
import { CallCanisterService } from "./callCanister.service";

/* Define types */
export interface ICRC112Request {
    canisterId: string;
    method: string;
    arg: string;
    nonce?: Uint32Array;
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

export interface SuccessResponse {
    result: CallCanisterResponse;
}

export interface ErrorResponse {
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
    private callCanisterService: CallCanisterService;
    private agent: Agent;

    constructor({
        callCanisterService,
        agent,
    }: {
        callCanisterService: CallCanisterService;
        agent: Agent;
    }) {
        this.callCanisterService = callCanisterService;
        this.agent = agent;
    }

    public async icrc112Execute(input: Icrc112Requests): Promise<Icrc112Response> {
        const arg = {
            jsonrpc: "2.0",
            method: this.getMethod(),
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: input,
            },
        };

        const finalResponse: Icrc112Response = { responses: [] };

        for (let i = 0; i < arg.params.requests.length; i++) {
            //Start parallel execution
            const parallelRequests = arg.params.requests[i];
            const parallelResponses = await this.parallelExecuteIcrcRequests(parallelRequests);

            //Process each response from batch call and map them to schema, Map them to "SuccessResponse" or "ErrorResponse"
            const icrc112ResponseItems: Icrc112ResponseItem[] =
                this.processResponse(parallelResponses);
            //End parallel execution

            finalResponse.responses.push(icrc112ResponseItems);

            if (icrc112ResponseItems.some((response) => "error" in response)) {
                for (let newIndex = i + 1; newIndex < arg.params.requests.length; newIndex++) {
                    const nonExecuteParallelRequestRow = arg.params.requests[newIndex];
                    const rowResponse: Icrc112ResponseItem[] =
                        this.assignNonExecuteRequestToErrorResult(
                            nonExecuteParallelRequestRow.length,
                        );
                    finalResponse.responses.push(rowResponse);
                }
                break;
            }
        }
        return finalResponse;
    }

    private processResponse(
        response: Array<Icrc112ResponseItem>,
        canisterValidation?: CanisterValidation,
    ): Icrc112ResponseItem[] {
        const responses: Icrc112ResponseItem[] = [];
        response.forEach((response) => {
            // Start ICRC-114
            if (canisterValidation) {
                //TODO: Complete ICRC-114 with canister validation
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

    private assignNonExecuteRequestToErrorResult(rowRequestLength: number): Icrc112ResponseItem[] {
        const rowResponse: Icrc112ResponseItem[] = [];
        for (let i = 0; i < rowRequestLength; i++) {
            rowResponse.push({
                error: {
                    code: 1001,
                    message: "Not processed due to batch request failure",
                },
            });
        }
        return rowResponse;
    }

    private async parallelExecuteIcrcRequests(
        requests: ParallelRequests,
    ): Promise<Array<Icrc112ResponseItem>> {
        const process_tasks: Promise<CallCanisterResponse>[] = [];
        const responses: Array<Icrc112ResponseItem> = [];

        requests.forEach((request) => {
            const task = this.callCanisterService.call({
                canisterId: request.canisterId,
                calledMethodName: request.method,
                parameters: request.arg,
                agent: this.agent,
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

    public getMethod(): string {
        return "icrc_112_batch_call_canister";
    }
}
