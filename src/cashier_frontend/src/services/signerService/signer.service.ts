import { Agent, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
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

type Icrc112ResponseItem = SuccessResponse | ErrorResponse;

export interface Icrc112Response {
    responses: Icrc112ResponseItem[][];
}
/* End define types */

class SignerService {
    private agent: Agent;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.agent = HttpAgent.createSync({ identity, host: "https://icp0.io" });
    }

    async icrc112Execute(input: IcrcxRequests): Promise<Icrc112Response> {
        const arg = {
            jsonrpc: "2.0",
            method: this.getMethod(),
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: input,
                validation: {
                    canisterId: "canisterId",
                    method: "validate",
                },
            },
        };

        const finalResponse: Icrc112Response = { responses: [] };

        for (let i = 0; i < arg.params.requests.length; i++) {
            const paralellRequests = arg.params.requests[i];
            const responsesFromBatchCall = await this.callBatchICRC112Requests(paralellRequests);

            //Process each response from batch call and map them to schema, Map them to "SuccessResponse" or "ErrorResponse"
            const icrc112ResponseItems: Icrc112ResponseItem[] =
                this.processResponse(responsesFromBatchCall);
            finalResponse.responses.push(icrc112ResponseItems);
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

    private async callBatchICRC112Requests(
        requests: ParallelRequests,
    ): Promise<Array<Icrc112ResponseItem>> {
        const process_tasks: Promise<CallCanisterResponse>[] = [];
        const responses: Array<Icrc112ResponseItem> = [];

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
        return "icrc_112_batch_call_canister";
    }
}

export default SignerService;
