// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { Principal } from "@dfinity/principal";
import { Actor, PocketIc } from "@dfinity/pic";
import {
    type _SERVICE,
    idlFactory,
} from "../../declarations/icp_ledger_canister/icp_ledger_canister.did";
import { linkIdToSubaccount } from ".";

type Subaccount = Uint8Array;
class LinkHelper {
    private pic: PocketIc;
    private actor?: Actor<_SERVICE>;

    constructor(pic: PocketIc) {
        this.pic = pic;
    }

    setupActor(canisterId: string) {
        this.actor = this.pic.createActor(idlFactory, Principal.fromText(canisterId));
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
        return linkIdToSubaccount(id);
    }
}

export default LinkHelper;
