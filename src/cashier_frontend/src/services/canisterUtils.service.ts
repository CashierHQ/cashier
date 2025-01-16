import { BACKEND_CANISTER_ID } from "@/const";
import { Agent, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IcrcLedgerCanister } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";

class UserService {
    private agent: Agent;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.agent = HttpAgent.createSync({ identity, host: "https://icp0.io" });
    }

    async checkAccountBalance(identity?: Identity | PartialIdentity | undefined) {
        const ledgerCanister = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(BACKEND_CANISTER_ID),
        });
        if (identity) {
            const data = await ledgerCanister.balance({
                owner: Principal.fromText(identity.toString()),
            });
            return data;
        }
        return null;
    }
}

export default UserService;
