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

export const SUPPORTED_PARSED_METHODS = [
    "icrc1_transfer",
    "icrc2_approve",
    "icrc2_transfer",
    "icrc7_transfer",
];

const STANDARDS_USING_BLOCK_ID = [
    "icrc1_transfer",
    "icrc2_approve",
    "icrc2_transfer",
    "icrc7_transfer",
];

export type Icrc112ResponseItem = SuccessResponse | ErrorResponse;

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
            method: "icrc_112_batch_call_canisters",
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
                    // Sets response to success
                    this.setResponse({
                        finalResponse,
                        isError: false,
                        rowIndex,
                        requestIndex,
                        successResult: singleResponse.result,
                    });
                    continue;
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

            if (rowHadError) {
                break outerLoop;
            }
        }

        // fill in 1001 errors for all requests in the row_index + 1 to last row
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

    public async testICRC112Execute(
        input: Icrc112Requests,
        linkTitle: string,
    ): Promise<Icrc112Response> {
        const arg = {
            jsonrpc: "2.0",
            method: "icrc_112_batch_call_canisters",
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: input,
                validation: undefined as { canisterId: string; method: string } | undefined,
            },
        };

        // Test scenario for 7.3
        if (linkTitle.includes("7.3")) {
            console.log("Detected 7.3 scenario");
            console.log("Sleeping for 20secs");
            await new Promise((resolve) => setTimeout(resolve, 20000));
        }

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
            let rowResponse: Icrc112ResponseItem[] = [];
            if (linkTitle.includes("7.4") && rowIndex == 1) {
                console.log("Detected 7.4 scenario");
                // Skip icrc2_transfer requests for 7.4 scenario
                rowResponse = [
                    {
                        error: {
                            code: 1002,
                            message: "ICRC2 requests are skipped in this test scenario",
                        },
                    },
                ];
            }
            if (linkTitle.includes("7.5") && rowIndex == 1) {
                console.log("Detected 7.5 scenario");
                // Sleep 10mins in the scenarios 7.5
                console.log("Sleeping for 10mins");
                await new Promise((resolve) => setTimeout(resolve, 100000));
                rowResponse = await this.parallelExecuteIcrcRequests(rowRequest, linkTitle);
            } else {
                rowResponse = await this.parallelExecuteIcrcRequests(rowRequest, linkTitle);
            }

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
                    // Sets response to success
                    this.setResponse({
                        finalResponse,
                        isError: false,
                        rowIndex,
                        requestIndex,
                        successResult: singleResponse.result,
                    });
                    continue;
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

            if (rowHadError) {
                break outerLoop;
            }
        }

        // fill in 1001 errors for all requests in the row_index + 1 to last row
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

    private processResponse(response: Array<Icrc112ResponseItem>): Icrc112ResponseItem[] {
        const responses: Icrc112ResponseItem[] = [];
        response.forEach((response) => {
            if ("result" in response) {
                responses.push({ result: response.result });
            } else {
                responses.push({ error: response.error });
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
        linkTitle?: string,
    ): Promise<Array<Icrc112ResponseItem>> {
        console.log("Processing requests with linkTitle:", linkTitle);
        const process_tasks: Promise<CallCanisterResponse>[] = [];
        const responses: Array<Icrc112ResponseItem> = [];

        for (const request of requests) {
            console.log(`Processing request for method: ${request.method}`);
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
        return "icrc_112_batch_call_canister";
    }
}
