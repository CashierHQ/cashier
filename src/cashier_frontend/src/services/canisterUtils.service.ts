import { BACKEND_CANISTER_ID } from "@/const";
import { Agent, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IcrcLedgerCanister } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { parse as uuidParse } from "uuid";

type Subaccount = Uint8Array;
class CanisterUtilsService {
    private agent: Agent;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.agent = HttpAgent.createSync({ identity, host: "https://icp0.io" });
    }

    async checkAccountBalance(canisterId: string, identity?: string) {
        const ledgerCanister = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(canisterId),
        });
        if (identity) {
            const data = await ledgerCanister.balance({
                owner: Principal.fromText(identity),
            });
            return data;
        }
        return null;
    }

    async checkAccountBalanceWithSubAccount(linkId: string, tokenAddress: string) {
        const ledgerCanister = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(tokenAddress),
        });
        const subaccount = this.toSubaccount(linkId);
        const data = await ledgerCanister.balance({
            owner: Principal.fromText(BACKEND_CANISTER_ID),
            subaccount: subaccount,
        });
        return data;
    }

    async transferTo(receiverAddress: string, tokenAddress: string, amount: number) {
        const ledgerCanister = IcrcLedgerCanister.create({
            agent: this.agent,
            canisterId: Principal.fromText(tokenAddress),
        });
        await ledgerCanister.transfer({
            to: {
                owner: Principal.fromText(receiverAddress),
                subaccount: [],
            },
            amount: BigInt(amount),
            fee: undefined,
            memo: undefined,
            from_subaccount: undefined,
            created_at_time: undefined,
        });
    }

    private toSubaccount(id: string): Subaccount {
        const uuidBytes = uuidParse(id);
        // DO NOT CHANGE THE ORDER OF THE BYTES
        const subaccount = new Uint8Array(32);
        subaccount.set(uuidBytes, 0);
        return subaccount;
    }
}

export default CanisterUtilsService;
