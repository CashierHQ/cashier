// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { Agent } from "@dfinity/agent";
import { CallCanisterResponse } from "../types/callCanister.service.types";
import { CallCanisterService } from "./callCanister.service";
import { JsonRequest } from "@slide-computer/signer";
import type { JsonObject, JsonValue } from "@dfinity/candid";
import { parseIcrc1Transfer, parseIcrc2Approve } from "../parser";

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

type ParallelRequests = Array<ICRC112Request>;

/**
 * Each sub array will execute in parallel and the next sub array will execute after the previous one is completed.
 */
export type SequenceRequest = Array<ParallelRequests>;

export type Icrc112Requests = SequenceRequest;

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

const SUPPORTED_PARSED_METHODS = [
    "icrc1_transfer",
    "icrc2_approve",
    "icrc2_transfer",
    "icrc7_transfer",
];

type Icrc112ResponseItem = SuccessResponse | ErrorResponse;

export interface Icrc112Response {
    responses: Icrc112ResponseItem[][];
}

// Define an interface for the parameters
interface SetResponseParams {
    finalResponse: Icrc112Response;
    isError: boolean;
    rowIndex: number;
    requestIndex: number;
    errorMessage?: string;
    errorCode?: number;
    successResult?: CallCanisterResponse;
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
            method: "icrc112_batch_call_canister",
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: input,
                validation: undefined as { canisterId: string; method: string } | undefined,
            },
        };

        let rowIndex = 0;
        const maxRow = arg.params.requests.length;
        let rowHadError = false;

        // Later add each individual response to this 2D array
        const finalResponse: Icrc112Response = {
            responses: arg.params.requests.map((row) => new Array(row.length).fill(null)),
        };

        outerLoop: for (rowIndex = 0; rowIndex < maxRow; rowIndex++) {
            // Step #1 Parallel executes all the requests in the sub-array
            const rowRequest = arg.params.requests[rowIndex];
            const rowResponse = await this.parallelExecuteIcrcRequests(rowRequest);
            console.log("🚀 ~ ICRC112Service ~ icrc112Execute ~ rowResponse:", rowResponse);

            // Step #2 Validate responses of each request in the sub-array
            for (let requestIndex = 0; requestIndex < rowRequest.length; requestIndex++) {
                const singleResponse = rowResponse[requestIndex];
                const singleRequest = rowRequest[requestIndex];
                // Validation 1: Check if raw response has error
                if ("error" in singleResponse) {
                    // Sets response to fail (error provided by response)
                    rowHadError = true;
                    this.setResponse({
                        finalResponse,
                        isError: true,
                        rowIndex,
                        requestIndex,
                        errorMessage: singleResponse.error.message,
                        errorCode: singleResponse.error.code,
                    });
                    continue;
                }

                // Skip validation 2 and 3 on last row
                else if (rowIndex == maxRow - 1) {
                    // no validation
                }

                // In addition to validation 1, response MUST pass EITHER validation 2 or 3
                else if (SUPPORTED_PARSED_METHODS.includes(singleRequest.method)) {
                    // Validation 2: Check block_id for recognized standards
                    if (
                        singleRequest.method == "icrc1_transfer" ||
                        singleRequest.method == "icrc2_approve" ||
                        singleRequest.method == "icrc2_transfer" ||
                        singleRequest.method == "icrc7_transfer"
                    ) {
                        //TODO: Serhii to implement this function
                        const blockId = this.parseReply(
                            singleRequest.method,
                            singleResponse.result.reply,
                        );
                        if (!blockId) {
                            // Sets response to fail (error 1003)
                            rowHadError = true;
                            this.setResponse({
                                finalResponse,
                                isError: true,
                                rowIndex,
                                requestIndex,
                                errorMessage: "Can not find block id",
                                errorCode: 1003,
                            });
                            continue;
                        }
                    }
                } else {
                    // Validation 3: Check by canister validation (ICRC-114)
                    if (arg.params.validation) {
                        // TODO: Call canister validation
                        // const canisterValidationResponse = Call canisterValidation();
                        // TODO: Set temporary canisterValidationResponse = false;
                        const canisterValidationResponse = false;
                        if (!canisterValidationResponse) {
                            // Sets response to fail (error 1003)
                            rowHadError = true;
                            this.setResponse({
                                finalResponse,
                                isError: true,
                                rowIndex,
                                requestIndex,
                                errorMessage: "Canister validation return false",
                                errorCode: 1003,
                            });
                            continue;
                        }
                    } else {
                        // Sets response to fail (error 1002)
                        rowHadError = true;
                        this.setResponse({
                            finalResponse,
                            isError: true,
                            rowIndex,
                            requestIndex,
                            errorMessage: "Canister validation is needed but not provided",
                            errorCode: 1002,
                        });
                        continue;
                    }
                }

                // Sets response to success if all validations passed
                this.setResponse({
                    finalResponse,
                    isError: false,
                    rowIndex,
                    requestIndex,
                    successResult: singleResponse.result,
                });

                console.log("🚀 ~ ICRC112Service ~ icrc112Execute ~ finalResponse:", finalResponse);
            }

            // If any of the requests in this row failed valididation, do not execute following rows (sub-arrays)
            if (rowHadError) {
                break outerLoop;
            }
        }

        // If execution was aborted because of a failed validation, fill in 1001 errors for all requests in remaining rows (rowIndex + 1 to maxRow)
        if (rowHadError) {
            for (let newIndex = rowIndex + 1; newIndex < maxRow; newIndex++) {
                const nonExecuteParallelRequestRow = arg.params.requests[newIndex];
                for (let reqIndex = 0; reqIndex < nonExecuteParallelRequestRow.length; reqIndex++) {
                    this.setResponse({
                        finalResponse,
                        isError: true,
                        rowIndex: newIndex,
                        requestIndex: reqIndex,
                        errorMessage: "Not processed due to batch request failure",
                        errorCode: 1001,
                    });
                }
            }
        }

        console.log("🚀 ~ ICRC112Service ~ icrc112Execute ~ finalResponse:", finalResponse);
        return finalResponse;
    }

    private setResponse(params: SetResponseParams) {
        console.log(params.finalResponse);
        if (params.isError) {
            params.finalResponse.responses[params.rowIndex][params.requestIndex] = {
                error: {
                    code: params.errorCode ?? 1003,
                    message: params.errorMessage ?? "Error while executing request",
                },
            };
        } else {
            params.finalResponse.responses[params.rowIndex][params.requestIndex] = {
                result: params.successResult ?? {
                    contentMap: "",
                    certificate: "",
                },
            };
        }
    }

    private parseReply(method: string, reply?: ArrayBuffer): bigint | undefined {
        // if rely is undefined, return error
        if (!reply) {
            return undefined;
        }

        let responseFromParse: JsonValue | undefined;

        switch (method) {
            case "icrc1_transfer":
                responseFromParse = parseIcrc1Transfer(reply);
                break;
            case "icrc2_approve":
                responseFromParse = parseIcrc2Approve(reply);
                break;
        }

        if (
            responseFromParse &&
            typeof responseFromParse === "object" &&
            "Ok" in responseFromParse
        ) {
            const okValue = responseFromParse.Ok;
            if (typeof okValue === "bigint") {
                return BigInt(okValue);
            }
        }
        return undefined;
    }

    private async parallelExecuteIcrcRequests(
        requests: ParallelRequests,
    ): Promise<Array<Icrc112ResponseItem>> {
        const process_tasks: Promise<CallCanisterResponse>[] = [];
        const responses: Array<Icrc112ResponseItem> = [];

        for (const request of requests) {
            console.log(`Processing request for method: ${request.method}`);
            console.log("Request:", request);
            const task = this.callCanisterService.call({
                canisterId: request.canisterId,
                calledMethodName: request.method,
                parameters: request.arg,
                agent: this.agent,
            });
            process_tasks.push(task);
        }

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
        return "icrc112_batch_call_canister";
    }
}
