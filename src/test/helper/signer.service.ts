// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { Agent } from "@dfinity/agent";
import { CallCanisterResponse, callCanisterService } from "./callCanister.service";

/* Define types */
export interface ICRCXRequest {
    canisterId: string;
    method: string;
    arg: string;
    nonce?: ArrayBuffer;
}

export type ParallelRequests = Array<ICRCXRequest>;

/**
 * Each sub array will execute in parallel and the next sub array will execute after the previous one is completed.
 */
export type SequenceRequest = Array<ParallelRequests>;

export type IcrcxRequests = SequenceRequest;

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

export type IcrcXResponseItem = SuccessResponse | ErrorResponse;

export interface IcrcXResponse {
    responses: IcrcXResponseItem[][];
}
/* End define types */

class SignerService {
    private agent: Agent;

    constructor(agent: Agent) {
        this.agent = agent;
    }

    async icrcxExecute(input: IcrcxRequests): Promise<IcrcXResponse> {
        const arg = {
            jsonrpc: "2.0",
            method: this.getMethod(),
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: input,
            },
        };

        const finalResponse: IcrcXResponse = { responses: [] };

        for (let i = 0; i < arg.params.requests.length; i++) {
            const paralellRequests = arg.params.requests[i];
            const responsesFromBatchCall = await this.callBatchICRCXRequests(paralellRequests);

            //Process each response and map them to schema, Map them to "SuccessResponse" or "ErrorResponse"
            const icrcXResponseItems: IcrcXResponseItem[] =
                this.processResponse(responsesFromBatchCall);
            finalResponse.responses.push(icrcXResponseItems);
        }
        return finalResponse;
    }

    private processResponse(response: Array<IcrcXResponseItem>): IcrcXResponseItem[] {
        const responses: IcrcXResponseItem[] = [];
        response.forEach((response) => {
            if ("result" in response) {
                responses.push({ result: response.result });
            } else {
                responses.push({ error: response.error });
            }
        });
        return responses;
    }

    private async callBatchICRCXRequests(
        requests: ParallelRequests,
    ): Promise<Array<IcrcXResponseItem>> {
        const process_tasks: Promise<CallCanisterResponse>[] = [];
        const responses: Array<IcrcXResponseItem> = [];

        requests.forEach((request) => {
            const task = callCanisterService.call({
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

    private getMethod(): string {
        return "icrcX_batch_call_canisters";
    }
}

export default SignerService;
