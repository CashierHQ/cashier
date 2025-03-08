/* eslint-disable @typescript-eslint/no-unused-vars */

import { _SERVICE, Icrc112Request } from "../../declarations/cashier_backend/cashier_backend.did";
import { Actor } from "@hadronous/pic";
import { TokenHelper } from "../utils/token-helper";
import { Principal } from "@dfinity/principal";
import { linkIdToSubaccount } from "../utils";
import { Account } from "@dfinity/ledger-icp";
import {
    ApproveArgs,
    TransferArg,
} from "../../declarations/icp_ledger_canister/icp_ledger_canister.did";
import { safeParseJSON } from "../utils/parser";
import { Identity } from "@dfinity/agent";

export function flattenAndFindByMethod(
    icrc_112_requests: Icrc112Request[][],
    method: string,
): Icrc112Request | undefined {
    return icrc_112_requests.flat().filter((request) => request.method === method)[0];
}

export class Icrc112Executor {
    private icrc_112_requests: Icrc112Request[][];
    private token_helper: TokenHelper;
    private identity: Identity;
    private link_id: string;
    private action_id: string;
    private spender_pid: Principal;
    private actor: Actor<_SERVICE>;
    private trigger_tx_id: string;

    constructor(
        icrc_112_requests: Icrc112Request[][],
        token_helper: TokenHelper,
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

    public async execute() {
        for (const row of this.icrc_112_requests) {
            for (const request of row) {
                this.token_helper.with_identity(this.identity);

                switch (request.method) {
                    case "icrc1_transfer":
                        await this.executeIcrc1Transfer();
                        break;
                    case "icrc2_approve":
                        await this.executeIcrc2Approve();
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

    public async executeIcrc1Transfer() {
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
            amount: BigInt(10_0000_0000),
        };
        this.token_helper.with_identity(this.identity);
        const transfer_res = await this.token_helper.transfer(transfer_arg);
        console.log("icrc1_transfer", safeParseJSON(transfer_res));
    }

    public async executeIcrc2Approve() {
        const approve_args: ApproveArgs = {
            fee: [],
            memo: [],
            from_subaccount: [],
            created_at_time: [],
            amount: BigInt(10_0000_0000),
            expected_allowance: [],
            expires_at: [],
            spender: {
                owner: this.spender_pid,
                subaccount: [],
            },
        };

        this.token_helper.with_identity(this.identity);
        const approve_res = await this.token_helper.approve(approve_args);
        console.log("approve_res", safeParseJSON(approve_res));
    }

    public async triggerTransaction() {
        this.actor.setIdentity(this.identity);
        const res_update_action = await this.actor.trigger_transaction({
            action_id: this.action_id,
            link_id: this.link_id,
            transaction_id: this.trigger_tx_id,
        });
        console.log("trigger_transaction response ", safeParseJSON(res_update_action));
    }
}
