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

import { BACKEND_CANISTER_ID, IC_HOST } from "@/const";
import { Agent, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IcrcLedgerCanister } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { parse as uuidParse } from "uuid";

type Subaccount = Uint8Array;
class CanisterUtilsService {
    private agent: Agent;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.agent = HttpAgent.createSync({ identity, host: IC_HOST });
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

    private toSubaccount(id: string): Subaccount {
        const uuidBytes = uuidParse(id);
        // DO NOT CHANGE THE ORDER OF THE BYTES
        const subaccount = new Uint8Array(32);
        subaccount.set(uuidBytes, 0);
        return subaccount;
    }
}

export default CanisterUtilsService;
