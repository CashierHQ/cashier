import {
    Icrc112Requests,
    Icrc112Response,
    ParallelRequests,
} from "../signerService/icrc112.service";
import { ICanisterCaller } from "./ICanisterCaller";
import { JsonRequest, JsonResponse } from "@slide-computer/signer";
import { IcrcMethod } from "@/types/icrc-method";
import { JsonObject } from "@dfinity/candid";
import { Icrc112Request } from "../../../../declarations/cashier_backend/cashier_backend.did";
import { NewCanisterCallerService } from "./NewCanisterCallerService";
import { canisterId } from "../../../../declarations/cashier_backend";

export class Icrc112Caller implements ICanisterCaller<Icrc112Requests, Icrc112Response> {
    public call(
        callerService: NewCanisterCallerService,
        data: Icrc112Requests,
    ): Promise<Icrc112Response> {
        throw new Error("Method not implemented.");
    }

    private async mapDataToRequest(
        callerService: NewCanisterCallerService,
        data: Icrc112Requests,
    ): Promise<JsonRequest> {
        const sender = await callerService.agent.getPrincipal();

        const request: JsonRequest = {
            id: "1",
            jsonrpc: "2.0",
            method: IcrcMethod.Icrc112BatchCallCanisters,
            params: {
                sender: sender.toString(),
                requests: data as unknown as JsonObject,
            },
        };

        return request;
    }

    private async executeCall(
        callerService: NewCanisterCallerService,
        request: JsonRequest,
    ): Promise<JsonResponse> {
        const requestMatrix = (request.params as any).requests as Icrc112Requests;

        for (const row of requestMatrix) {
            const rowPromises = this.getRowPromises(agent, row);
        }
    }

    private getRowPromises(callerService: NewCanisterCallerService, row: ParallelRequests) {
        return row.map((request) =>
            this.getRequestPromise(agent, request as unknown as Icrc112Request),
        );
    }

    private getRequestPromise(callerService: NewCanisterCallerService, request: Icrc112Request) {
        const caller = callerService.getUniversalCaller();

        caller.call(callerService, request as JsonRequest);
    }

    private async mapResponseToResult(response: JsonResponse): Promise<Icrc112Response> {}
}
