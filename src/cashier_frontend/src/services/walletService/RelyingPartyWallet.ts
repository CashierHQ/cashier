import { HttpAgent, Identity } from "@dfinity/agent";
import { Icrc112Requests, Icrc112Response, ICRC112Service } from "../signerService/icrc112.service";
import { Wallet } from "./Wallet";
import { callCanisterService } from "../signerService/callCanister.service";

export class RelyingPartyWallet extends Wallet {
    private agent: HttpAgent;

    constructor(identity: Identity) {
        super();
        this.agent = HttpAgent.createSync({ identity, host: "https://icp0.io" });
    }

    public execute(input: Icrc112Requests): Promise<Icrc112Response> {
        return this.executeBatchTransactions(input);
    }

    private async executeBatchTransactions(input: Icrc112Requests): Promise<Icrc112Response> {
        const icrc112 = new ICRC112Service({ callCanisterService, agent: this.agent });

        return icrc112.icrc112Execute(input);
    }
}
