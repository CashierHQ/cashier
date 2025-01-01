import { Agent, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { TransactionModel } from "./types/intent.service.types";
import { CallCanisterResponse, callCanisterService } from "./callCanisterService";

/* Define types */
export interface ICRCXRequest {
    id: string;
    canisterId: string;
    method: string;
    arg: string;
}

export interface ParallelRequest {
    request: ICRCXRequest[];
}

export interface CallCanisterRequestModel {
    jsonrpc: string;
    method: string;
    params: {
        sender: string;
        requests: Array<ICRCXRequest[]>;
        validation?: {
            canisterId: string;
            method: string;
        };
    };
}

export interface SuccessResponse {
    id: string;
    result: CallCanisterResponse;
}

export interface ErrorResponse {
    id: string;
    error: {
        code: number;
        message: string;
        data?: unknown;
    };
}

export type IcrcXResponseItem = SuccessResponse | ErrorResponse;

export interface IcrcXResponse {
    responses: IcrcXResponseItem[];
}
/* End define types */

class SignerService {
    private agent: Agent;
    private parallelRequest: ParallelRequest;

    constructor(
        transactions: TransactionModel[],
        identity?: Identity | PartialIdentity | undefined,
    ) {
        this.agent = HttpAgent.createSync({ identity, host: "https://icp0.io" });
        this.parallelRequest = {
            request: transactions.map((transaction) => ({
                id: transaction.id,
                canisterId: transaction.canister_id,
                method: transaction.method,
                arg: transaction.arg,
            })),
        };
    }

    async callCanisterTransfer(): Promise<IcrcXResponse[]> {
        const requiredParams = await this.getRequiredParams();
        const responses: IcrcXResponse[] = [];
        while (responses.length < requiredParams.params.requests.length) {
            for (let i = 0; i < requiredParams.params.requests.length; i++) {
                const paralellRequests = requiredParams.params.requests[i];
                const responsesFromBatchCall = await this.callBatchICRCXRequests(paralellRequests);

                //Process each response and map them to schema, Map them to "SuccessResponse" or "ErrorResponse"
                const icrcXResponseItems: IcrcXResponseItem[] =
                    this.processResponse(responsesFromBatchCall);
                responses.push({ responses: icrcXResponseItems });
            }
        }
        return responses;
    }

    private processResponse(
        response: Map<
            string,
            | { result: CallCanisterResponse }
            | { error: { code: number; message: string; data?: unknown } }
        >,
    ): IcrcXResponseItem[] {
        const responses: IcrcXResponseItem[] = [];
        response.forEach((response, requestId) => {
            if ("result" in response) {
                responses.push({ id: requestId, result: response.result });
            } else {
                responses.push({ id: requestId, error: response.error });
            }
        });
        return responses;
    }

    private async callBatchICRCXRequests(
        requests: ICRCXRequest[],
    ): Promise<
        Map<
            string,
            | { result: CallCanisterResponse }
            | { error: { code: number; message: string; data?: unknown } }
        >
    > {
        const process_tasks: Promise<CallCanisterResponse>[] = [];
        const requestIdList: string[] = [];
        const responses: Map<
            string,
            | { result: CallCanisterResponse }
            | {
                  error: {
                      code: number;
                      message: string;
                      data?: unknown;
                  };
              }
        > = new Map();

        requests.forEach((request) => {
            const task = callCanisterService.call({
                canisterId: request.canisterId,
                calledMethodName: request.method,
                parameters: request.arg,
                agent: this.agent,
            });
            process_tasks.push(task);
            requestIdList.push(request.id);
        });
        const results = await Promise.allSettled(process_tasks);
        // Process each result
        results.forEach((result, index) => {
            if (result.status === "fulfilled") {
                const response: CallCanisterResponse = result.value;
                responses.set(requestIdList[index], { result: response });
            } else if (result.status === "rejected") {
                const error = result.reason;
                responses.set(requestIdList[index], {
                    error: {
                        code: 1000,
                        message: error.message,
                    },
                });
            }
        });
        return responses;
    }

    private async getRequiredParams(): Promise<CallCanisterRequestModel> {
        return {
            jsonrpc: "2.0",
            method: this.getMethod(),
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: [this.parallelRequest.request],
            },
        };
    }

    private getMethod(): string {
        return "icrcX_batch_call_canisters";
    }
}

export default SignerService;
