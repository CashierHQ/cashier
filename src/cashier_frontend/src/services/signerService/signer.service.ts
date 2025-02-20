import { Agent, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { Icrc112Requests, Icrc112Response, ICRC112Service } from "./icrc112.service";
import { callCanisterService } from "./callCanister.service";
import { Signer } from "./signer";
import { AuthClientTransport } from "./transport";
import { AuthClientConnection } from "./connection";
import { AuthClient } from "@dfinity/auth-client";
import { JsonRequest } from "@slide-computer/signer";
import type { JsonObject } from "@dfinity/candid";

class SignerService {
    private agent: Agent;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.agent = HttpAgent.createSync({ identity, host: "https://icp0.io" });
    }

    async callIcrc112(input: Icrc112Requests): Promise<Icrc112Response> {
        const transport = await AuthClientTransport.create({});
        const signer = new Signer({ transport });

        const request: JsonRequest = {
            jsonrpc: "2.0",
            method: "icrc112_execute",
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: input as unknown as JsonObject,
            },
        };
        signer.sendRequest(request);
        const icrc112Service = new ICRC112Service({
            agent: this.agent,
            callCanisterService: callCanisterService,
        });
        const response = await icrc112Service.icrc112Execute(input);
        return response;
    }

    async testSigner(input: Icrc112Requests) {
        const transport = await AuthClientTransport.create({});
        const signer = new Signer({ transport });

        const request: JsonRequest = {
            jsonrpc: "2.0",
            method: "icrc112_execute",
            params: {
                sender: (await this.agent.getPrincipal()).toString(),
                requests: input as unknown as JsonObject,
            },
        };
        signer.sendRequest(request);
    }
}

export default SignerService;
