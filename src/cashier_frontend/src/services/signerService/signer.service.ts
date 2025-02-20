import { Agent, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { Icrc112Requests, Icrc112Response, ICRC112Service } from "./icrc112.service";
import { callCanisterService } from "./callCanister.service";
import { Signer } from "./signer";
import { AuthClientTransport } from "./transport";
import { JsonRequest } from "@slide-computer/signer";
import type { JsonObject } from "@dfinity/candid";

class SignerService {
    private agent: HttpAgent;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.agent = HttpAgent.createSync({ identity, host: "https://icp0.io" });
    }

    async callIcrc112(input: Icrc112Requests): Promise<Icrc112Response> {
        const icrc112Service = new ICRC112Service({
            agent: this.agent,
            callCanisterService: callCanisterService,
        });
        const response = await icrc112Service.icrc112Execute(input);
        return response;
    }

    async executeIcrc112(input: Icrc112Requests) {
        const transport = await AuthClientTransport.create({
            agent: this.agent,
        });
        const signer = new Signer({ transport });

        const request: JsonRequest = {
            id: "1",
            jsonrpc: "2.0",
            method: "icrc112_execute",
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: input as unknown as JsonObject,
            },
        };
        const response = await signer.sendRequest(request);
        console.log("🚀 ~ SignerService ~ executeIcrc112 ~ response:", response);
    }
}

export default SignerService;
