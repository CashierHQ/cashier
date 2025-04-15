import { Principal } from "@dfinity/principal";
import { Actor, PocketIc } from "@hadronous/pic";
import {
    type _SERVICE,
    idlFactory,
} from "../../declarations/icp_ledger_canister/icp_ledger_canister.did";
import { parse as uuidParse } from "uuid";

type Subaccount = Uint8Array;
class LinkHelper {
    private pic: PocketIc;
    private actor?: Actor<_SERVICE>;

    constructor(pic: PocketIc) {
        this.pic = pic;
    }

    async setupActor(canisterId: string) {
        this.actor = await this.pic.createActor(idlFactory, Principal.fromText(canisterId));
    }

    async checkAccountBalanceWithSubAccount(backendCanisterId: string, linkId: string) {
        if (!this.actor) {
            throw new Error("Actor not setup");
        }

        const subaccount = this.toSubaccount(linkId);
        const balance = await this.actor.icrc1_balance_of({
            owner: Principal.fromText(backendCanisterId),
            subaccount: [subaccount],
        });

        return balance;
    }

    private toSubaccount(id: string): Subaccount {
        const uuidBytes = uuidParse(id);
        // DO NOT CHANGE THE ORDER OF THE BYTES
        const subaccount = new Uint8Array(32);
        subaccount.set(uuidBytes, 0);
        return subaccount;
    }
}

export default LinkHelper;
