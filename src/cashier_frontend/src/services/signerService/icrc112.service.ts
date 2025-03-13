import { Agent } from "@dfinity/agent";
import { CallCanisterResponse } from "../types/callCanister.service.types";
import { CallCanisterService } from "@/services/canisterCallService/canisterCallService";
import { JsonRequest } from "@slide-computer/signer";
import type { JsonObject } from "@dfinity/candid";
import { IcrcMethod } from "@/types/icrc-method";
import { CandidJSON, InterfaceFactory } from "./candidHelper";
import { IDL } from "@dfinity/candid";

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
        const sequenceFailed = false;

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

            //Process each response from batch call and map them to schema, Map them to "SuccessResponse" or "ErrorResponse"
            const icrc112ResponseItems: Icrc112ResponseItem[] =
                this.processResponse(parallelResponses);
            //End parallel execution

            //finalResponse.responses.push(icrc112ResponseItems);

            // Step #2 Validate all the transactions in the row (skip when i = arg.params.requests.length-1)
            // Step #2.1 validate if received response
            // if no response return 1001 error
            if (icrc112ResponseItems.some((response) => "error" in response)) {
                finalResponse.responses.push(icrc112ResponseItems);
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

            // Step #2.2 if tx uses a reqcognized standards

            // ICRC-1,2,7 validate that certificate has block id... if no block id return 1001 error
            for (let newIndex = 0; newIndex < parallelRequests.length; newIndex++) {
                const singleRowResponse = icrc112ResponseItems[newIndex];
                const singleRowRequest = parallelRequests[newIndex];
                // If the request.method is known standard
                // ICRC-1,2,7 validate that certificate has block id existed
                if (
                    singleRowRequest.method == "ICRC-1" ||
                    singleRowRequest.method == "ICRC-2" ||
                    singleRowRequest.method == "ICRC-7"
                ) {
                    const parsedCertificated = this.parseCertificate(singleRowResponse.certificate);

                    if (parsedCertificated.block_id in response) {
                        // do nothing (continue the loop)
                    } else {
                        //TODO: Do below steps:
                        // this response is 1003 error
                        icrc112ResponseItems[newIndex] = {
                            error: {
                                code: 1003,
                                message: "Certificate does not have block id",
                            },
                        };

                        for (
                            let newIndex = i + 1;
                            newIndex < arg.params.requests.length;
                            newIndex++
                        ) {
                            const nonExecuteParallelRequestRow = arg.params.requests[newIndex];
                            const rowResponses: Icrc112ResponseItem[] =
                                this.assignNonExecuteRequestToErrorResult(
                                    nonExecuteParallelRequestRow.length,
                                );
                            finalResponse.responses.push(rowResponses);
                        }
                        break;
                    }

                    // If the request.method is NOT known standard
                } else {
                    const canisterValidation = arg.params.validation;
                    if (canisterValidation) {
                        //const response = Call canisterValidation();
                        //TODO: replace with above
                        const responseCanisterValidation = true;
                        if (responseCanisterValidation) {
                            // do nothing (continue the loop)
                        } else {
                            // TODO: Do this part later
                            finalResponse.responses.push(icrc112ResponseItems);
                            //Return of request is 1003
                            //Break and fill response of remaining rows with 1001 error
                        }
                    } else {
                        // TODO: Do this part later
                        //Return of request is 1002
                        //Break and fill response of remaining rows with 1001 error
                    }
                }
            }
        }
        return finalResponse;
    }

    private parseCertificate(certificate: string) {
        //const candid = new CandidJSON({IDL: IDL});
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
