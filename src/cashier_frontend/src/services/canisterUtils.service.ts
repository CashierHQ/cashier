import { Agent, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IcrcLedgerCanister } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";

class CanisterUtilsService {
    private agent: Agent;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.agent = HttpAgent.createSync({ identity, host: "https://icp0.io" });
    }

    async checkAccountBalance(
        canisterId: string,
        identity?: Identity | PartialIdentity | undefined,
    ) {
        const ledgerCanister = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(canisterId),
        });
        if (identity) {
            const data = await ledgerCanister.balance({
                owner: identity.getPrincipal(),
            });
            return data;
        }
        return null;
    }
}

export default CanisterUtilsService;
