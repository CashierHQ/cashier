import { HttpAgent } from "@dfinity/agent";
import { Icrc112Requests, Icrc112Response } from "../signerService/icrc112.service";
import { ICanisterCaller } from "./ICanisterCaller";
import { JsonRequest, JsonResponse } from "@slide-computer/signer";
import { IcrcMethod } from "@/types/icrc-method";
import { JsonObject } from "@dfinity/candid";

export class Icrc112Caller implements ICanisterCaller<Icrc112Requests, Icrc112Response> {
    public call(agent: HttpAgent, data: Icrc112Requests): Promise<Icrc112Response> {
        throw new Error("Method not implemented.");
    }

    private async mapDataToRequest(agent: HttpAgent, data: Icrc112Requests): Promise<JsonRequest> {
        const sender = await agent.getPrincipal();

        const request: JsonRequest = {
            id: "1",
            jsonrpc: "2.0",
            method: IcrcMethod.BatchCallCanisters,
            params: {
                sender: sender.toString(),
                requests: data as unknown as JsonObject,
            },
        };

        return request;
    }

    private executeCall(agent: HttpAgent): JsonResponse;

    private mapResponseToResult(response: JsonResponse): Icrc112Response {}
}
