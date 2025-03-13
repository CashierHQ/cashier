import { Agent } from "@dfinity/agent";
import { CallCanisterResponse } from "../types/callCanister.service.types";
import { CallCanisterService } from "@/services/canisterCallService/canisterCallService";
import { JsonRequest } from "@slide-computer/signer";
import type { JsonObject } from "@dfinity/candid";
import { IcrcMethod } from "@/types/icrc-method";

/* Define types */
export type JsonICRC112Request = JsonRequest<
    "icrc112_execute",
    {
        sender: string;
        requests: Icrc112Requests;
    }
>;

export interface ICRC112Request extends JsonObject {
    canisterId: string;
    method: string;
    arg: string;
    // base64 bytes string
    nonce: string;
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
            method: IcrcMethod.Icrc112BatchCallCanisters,
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: input,
                validation: undefined as { canisterId: string; method: string } | undefined,
            },
        };

        const finalResponse: Icrc112Response = { responses: [] };

        for (let i = 0; i < arg.params.requests.length; i++) {
            // Step #1 Parallel executes all the requests in the sub-array
            const parallelRequests = arg.params.requests[i];
            const parallelResponses = await this.parallelExecuteIcrcRequests(parallelRequests);

            // Step #2 Validate all the transactions in the row (skip when i = arg.params.requests.length-1)
            if (i < arg.params.requests.length - 1) {
                for (let j = 0; j < parallelResponses.length; j++) {
                    const response = parallelResponses[j];
                    const request = parallelRequests[j];

                    // Step #2.1 validate if received response
                    if ("error" in response) {
                        //this req =>
                        break;
                    }

                    // Step #2.2 if tx uses a recognized standards
                    if (SUPPORTED_PARSED_METHODS.includes(request.method)) {
                        // ICRC-1,2,7 validate that certificate has block id
                        if (!response.result.certificate) {
                            parallelResponses[j] = {
                                error: {
                                    code: 1004,
                                    message: "Missing certificate for ICRC standard transaction",
                                },
                            };
                        }
                    } else {
                        // Step #2.3 if tx does not use a recognized standards
                        const validation = arg.params.validation;
                        if (validation) {
                            try {
                                await this.callCanisterService.call({
                                    canisterId: validation.canisterId,
                                    calledMethodName: validation.method,
                                    parameters: request.arg,
                                    agent: this.agent,
                                });
                            } catch (error) {
                                // if canister validation call failed 1003
                                parallelResponses[j] = {
                                    error: {
                                        code: 1003,
                                        message: `Canister validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                                    },
                                };
                            }
                        } else {
                            // if canister validation wasn't provided 1002
                            parallelResponses[j] = {
                                error: {
                                    code: 1002,
                                    message:
                                        "Missing canister validation for non-standard transaction",
                                },
                            };
                        }
                    }
                }
            }

            //Process each response from batch call and map them to schema, Map them to "SuccessResponse" or "ErrorResponse"
            const icrc112ResponseItems: Icrc112ResponseItem[] =
                this.processResponse(parallelResponses);
            //End parallel execution

            finalResponse.responses.push(icrc112ResponseItems);

            // If there are any error responses in the current row,
            // then break and assign non-execute requests to error result
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
        items: Array<Icrc112ResponseItem>,
        canisterValidation?: CanisterValidation,
    ): Icrc112ResponseItem[] {
        return items.map((item) => this.processSingleResponse(item, canisterValidation));
    }

    private processSingleResponse(
        item: Icrc112ResponseItem,
        canisterValidation?: CanisterValidation,
    ) {
        // Start ICRC-114
        if (canisterValidation) {
            // TODO: Complete ICRC-114 with canister validation
            // End ICRC-114
            throw new Error("Canister validation not supported");
        } else {
            if ("result" in item) {
                return { result: item.result } as SuccessResponse;
            } else {
                return { error: item.error } as ErrorResponse;
            }
        }
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
        const responses: Array<Icrc112ResponseItem> = [];

        const process_tasks = requests.map<Promise<CallCanisterResponse>>((request) =>
            this.callCanisterService.call({
                canisterId: request.canisterId,
                calledMethodName: request.method,
                parameters: request.arg,
                agent: this.agent,
            }),
        );

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
}
