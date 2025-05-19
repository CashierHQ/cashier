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

/* eslint-disable @typescript-eslint/no-unused-vars */

import { _SERVICE, Icrc112Request } from "../../declarations/cashier_backend/cashier_backend.did";
import { Actor } from "@dfinity/pic";
import { Principal } from "@dfinity/principal";
import { linkIdToSubaccount } from "../utils";
import { Account } from "@dfinity/ledger-icp";
import {
    ApproveArgs,
    TransferArg,
} from "../../declarations/icp_ledger_canister/icp_ledger_canister.did";
import { Identity } from "@dfinity/agent";
import { MultipleTokenHelper } from "./multiple-token-helper";

export class Icrc112ExecutorV2 {
    private icrc_112_requests: Icrc112Request[][];
    private token_helper: MultipleTokenHelper;
    private identity: Identity;
    private link_id: string;
    private action_id: string;
    private spender_pid: Principal;
    private actor: Actor<_SERVICE>;
    private trigger_tx_id: string;

    constructor(
        icrc_112_requests: Icrc112Request[][],
        token_helper: MultipleTokenHelper,
        identity: Identity,
        link_id: string,
        action_id: string,
        spender_pid: Principal,
        actor: Actor<_SERVICE>,
        trigger_tx_id: string,
    ) {
        this.icrc_112_requests = icrc_112_requests;
        this.token_helper = token_helper;
        this.identity = identity;
        this.link_id = link_id;
        this.action_id = action_id;
        this.spender_pid = spender_pid;
        this.actor = actor;
        this.trigger_tx_id = trigger_tx_id;
    }

    public async execute(token_name: string, amount: bigint) {
        for (const row of this.icrc_112_requests) {
            for (const request of row) {
                this.token_helper.with_identity(this.identity);

                switch (request.method) {
                    case "icrc1_transfer":
                        await this.executeIcrc1Transfer(token_name, amount);
                        break;
                    case "icrc2_approve":
                        await this.executeIcrc2Approve(token_name, amount);
                        break;
                    case "trigger_transaction":
                        await this.triggerTransaction();
                        break;
                    default:
                        console.log("method not found");
                }
            }
        }
    }

    public async executeIcrc1Transfer(token_name: string, amount: bigint) {
        const link_vault: Account = {
            owner: this.spender_pid,
            subaccount: [linkIdToSubaccount(this.link_id)],
        };

        const transfer_arg: TransferArg = {
            to: link_vault,
            fee: [],
            memo: [],
            from_subaccount: [],
            created_at_time: [],
            amount: amount,
        };
        this.token_helper.with_identity(this.identity);
        await this.token_helper.transfer(token_name, transfer_arg);
    }

    public async executeIcrc2Approve(token_name: string, amount: bigint) {
        const approve_args: ApproveArgs = {
            fee: [],
            memo: [],
            from_subaccount: [],
            created_at_time: [],
            amount: amount,
            expected_allowance: [],
            expires_at: [],
            spender: {
                owner: this.spender_pid,
                subaccount: [],
            },
        };

        this.token_helper.with_identity(this.identity);
        const res = await this.token_helper.approve(token_name, approve_args);

        console.log("approve result", res);
    }

    public async triggerTransaction() {
        this.actor.setIdentity(this.identity);
        await this.actor.trigger_transaction({
            action_id: this.action_id,
            link_id: this.link_id,
            transaction_id: this.trigger_tx_id,
        });
    }
}
