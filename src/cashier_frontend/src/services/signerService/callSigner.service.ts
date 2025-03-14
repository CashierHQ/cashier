import { HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { Icrc112Requests, Icrc112Response, ICRC112Service } from "./icrc112.service";
import { Signer } from "./signer";
import { ClientTransport } from "./transport";
import { JsonRequest, JsonResponse } from "@slide-computer/signer";
import type { JsonObject } from "@dfinity/candid";
import { callCanisterService } from "./callCanister.service";

class CallSignerService {
    private agent: HttpAgent;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.agent = HttpAgent.createSync({ identity, host: "https://icp0.io" });
    }

    async execute(input: Icrc112Requests): Promise<Icrc112Response> {
        const transport = await ClientTransport.create({
            agent: this.agent,
        });
        const signer = new Signer({ transport });

        const request: JsonRequest = {
            id: "1",
            jsonrpc: "2.0",
            method: "icrc_112_batch_call_canisters",
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: input as unknown as JsonObject,
            },
        };
        const response = await signer.sendRequest(request);
        console.log("🚀 ~ CallSignerService ~ executeIcrc112 ~ response:", response);
        return this.parseResponse<Icrc112Response>(response);
    }

    async tesstExecute(input: Icrc112Requests, linkTitle: string): Promise<Icrc112Response> {
        const icrc112Service = new ICRC112Service({
            callCanisterService: callCanisterService,
            agent: this.agent,
        });
        const response = await icrc112Service.icrc112Execute(input);
        return response;
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
