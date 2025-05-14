import { HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { Icrc112Requests, Icrc112Response } from "./icrc112.service";
import { Signer } from "./signer";
import { ClientTransport } from "./transport";
import { JsonRequest, JsonResponse } from "@slide-computer/signer";
import type { JsonObject } from "@dfinity/candid";
import { IC_HOST } from "@/const";

class CallSignerService {
    private agent: HttpAgent;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.agent = HttpAgent.createSync({ identity, host: IC_HOST });
    }

    async execute(input: Icrc112Requests): Promise<Icrc112Response> {
        const transport = await ClientTransport.create({
            agent: this.agent,
        });
        const signer = new Signer({ transport });

        const request: JsonRequest = {
            id: "1",
            jsonrpc: "2.0",
            method: "icrc112_batch_call_canister",
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: input as unknown as JsonObject,
            },
        };
        const response = await signer.sendRequest(request);
        console.log("🚀 ~ CallSignerService ~ executeIcrc112 ~ response:", response);
        return this.parseResponse<Icrc112Response>(response);
    }

    private parseResponse<T>(jsonObj: JsonResponse): T {
        if ("result" in jsonObj) {
            return jsonObj.result as unknown as T;
        } else {
            throw new Error(`Error in response: ${JSON.stringify(jsonObj.error)}`);
        }
    }
}

export default CallSignerService;
