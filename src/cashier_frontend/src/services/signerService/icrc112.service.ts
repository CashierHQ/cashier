import { Agent } from "@dfinity/agent";
import { CallCanisterResponse } from "../types/callCanister.service.types";
import { CallCanisterService } from "./callCanister.service";
import { JsonRequest } from "@slide-computer/signer";
import type { JsonObject } from "@dfinity/candid";

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

        // Later add each individual response to this 2D array
        const finalResponse: Icrc112Response = { responses: [] };

        outerLoop: for (rowIndex = 0; rowIndex < maxRow; rowIndex++) {
            let rowHadError = false;
            // Step #1 Parallel executes all the requests in the sub-array
            const rowRequest = arg.params.requests[rowIndex];
            const rowResponse = await this.parallelExecuteIcrcRequests(rowRequest);

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
                else if (rowIndex= maxRow-1) {
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

                // After validation 1, response MUST pass EITHER validation 2 or 3
                else if (singleRequest.method in SUPPORTED_PARSED_METHODS) {
                    // Validation 2: Check block_id for recognized standards
                    if (singleRequest.method == "icrc1_transfer"
                        || singleRequest.method == "icrc2_approve"
                        || singleRequest.method == "icrc2_transfer"
                        || singleRequest.method == "icrc7_transfer") {
                        //TODO: Serhii to implement this function
                        const blockId = this.parseReply(singleResponse.result.reply);
                        if (blockId) {
                            // Sets response to success
                            this.setResponse({
                                finalResponse,
                                isError: false,
                                rowIndex,
                                requestIndex,
                                successResult: singleResponse.result,
                            });
                        } else {
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
                        }
                    } else {
                        // Placeholder for validating requests that use standards aside from ICRC-1, 2, 7
                        // Sets response to success
                        this.setResponse({
                            finalResponse,
                            isError: false,
                            rowIndex,
                            requestIndex,
                            successResult: singleResponse.result,
                        });
                    }
                    continue;
                } else {
                    // Validation 3: Check by canister validation (ICRC-114)
                    if (arg.params.validation) {
                        // TODO: Call canister validation
                        // const canisterValidationResponse = Call canisterValidation();
                        if (canisterValidationResponse) {
                            // Sets response to success
                            this.setResponse({
                                finalResponse,
                                isError: false,
                                rowIndex,
                                requestIndex,
                                successResult: singleResponse.result,
                            });
                        } else {
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
                    }
                    continue;
                }
            }

            if (rowHadError) {
                // fill in 1001 errors for all requests in the row_index + 1 to last row
                for (let newIndex = rowIndex + 1; newIndex < maxRow; newIndex++) {
                    const nonExecuteParallelRequestRow = arg.params.requests[newIndex];
                    const rowResponse: Icrc112ResponseItem[] =
                        this.assignNonExecuteRequestToErrorResult(
                            nonExecuteParallelRequestRow.length,
                        );
                    finalResponse.responses.push(rowResponse);
                }
                break outerLoop;
            }
        }
        return finalResponse;
    }

    private setResponse(params: SetResponseParams) {
        if (params.isError) {
            params.finalResponse.responses[params.rowIndex][params.requestIndex] = {
                error: {
                    code: params.errorCode ? params.errorCode : 1003,
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

    private parseReply(reply?: string): string {
        // if rely is undefined, return error
        //const candid = new CandidJSON({IDL: IDL});
        return "temporary success";
    }

    public async testICRC112Execute(
        input: Icrc112Requests,
        linkTitle: string,
    ): Promise<Icrc112Response> {
        console.log("Test execution started with linkTitle:", linkTitle);

        // Add delay for 7.3 scenario
        if (linkTitle?.includes("7.3")) {
            console.log("Detected 7.3 scenario - adding 20 secs delay");
            await new Promise((resolve) => setTimeout(resolve, 20000));
        }

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
            const parallelResponses = await this.parallelExecuteIcrcRequests(
                parallelRequests,
                linkTitle,
            );

            // Add delay for 7.5 scenario
            if (linkTitle?.includes("7.5")) {
                console.log("Detected 7.5 scenario - adding 10 mins delay");
                await new Promise((resolve) => setTimeout(resolve, 600000));
            }

            //Process each response from batch call and map them to schema
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
            // Skip icrc2 requests for both 7.4 and 7.5 scenarios
            if (
                (linkTitle?.includes("7.4") || linkTitle?.includes("7.5")) &&
                request.method.includes("icrc2")
            ) {
                console.log(`Skipping ICRC2 request for method: ${request.method}`);
                responses.push({
                    error: {
                        code: 1002,
                        message: "ICRC2 requests are skipped in this test scenario",
                    },
                });
                continue;
            }
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
