import { Agent, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { Icrc112Requests, Icrc112Response, ICRC112Service } from "./icrc112.service";
class SignerService {
    private agent: Agent;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.agent = HttpAgent.createSync({ identity, host: "https://icp0.io" });
    }

    async callIcrc112(input: Icrc112Requests): Promise<Icrc112Response> {
        const response = await ICRC112Service.icrc112Execute(input, this.agent);
        return response;
    }
}

export default SignerService;
