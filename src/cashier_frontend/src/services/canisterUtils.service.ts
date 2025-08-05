// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { BACKEND_CANISTER_ID } from "@/const";
import { getAgent } from "@/utils/agent";
import { Agent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { IcrcLedgerCanister } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { parse as uuidParse } from "uuid";

type Subaccount = Uint8Array;
class CanisterUtilsService {
    private agent: Agent;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.agent = getAgent(identity);
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
