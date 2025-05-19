// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

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
