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

import { Identity } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { Actor, createIdentity, PocketIc } from "@dfinity/pic";
import { resolve } from "path";

import {
    type _SERVICE,
    ApproveArgs,
    InitArgs,
    LedgerCanisterPayload,
    init as ledgerInit,
    TransferArg,
    idlFactory,
} from "../../declarations/icp_ledger_canister/icp_ledger_canister.did";
import { Account, principalToAccountIdentifier } from "@dfinity/ledger-icp";
import { IDL } from "@dfinity/candid";

const LEDGER_ID = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

export class TokenHelper {
    private pic: PocketIc;
    private deployer: Identity;
    private wasm_path: string;
    private actor?: Actor<_SERVICE>;
    private canister_id?: string;
    constructor(pic: PocketIc) {
        this.pic = pic;
        this.deployer = createIdentity("tokenDeployer");
        this.wasm_path = resolve("artifacts", "token_canister.wasm.gz");
    }

    public getCanisterId() {
        if (!this.canister_id) {
            throw new Error("Canister not setup");
        }
        return this.canister_id;
    }

    public setupCanister = async () => {
        const init_args: InitArgs = {
            send_whitelist: [],
            token_symbol: [],
            transfer_fee: [],
            minting_account: principalToAccountIdentifier(this.deployer.getPrincipal()),
            maximum_number_of_accounts: [],
            accounts_overflow_trim_quantity: [],
            transaction_window: [],
            max_message_size_bytes: [],
            icrc1_minting_account: [],
            archive_options: [],
            initial_values: [],
            token_name: ["ICP"],
            feature_flags: [],
        };

        const ledgerCanisterPayload: LedgerCanisterPayload = {
            Init: init_args,
        };

        const encoded_arg = IDL.encode(
            ledgerInit({
                IDL,
            }),
            [ledgerCanisterPayload],
        );

        // const subnet = await this.pic.getNnsSubnet();

        const canister_id = await this.pic.createCanister({
            cycles: BigInt(1e13),
            sender: this.deployer.getPrincipal(),
            targetCanisterId: LEDGER_ID,
            // targetSubnetId: subnet?.id,
        });

        this.canister_id = canister_id.toString();

        await this.pic.installCode({
            wasm: this.wasm_path,
            sender: this.deployer.getPrincipal(),
            canisterId: canister_id,
            arg: encoded_arg,
        });

        const actor = await this.pic.createActor<_SERVICE>(idlFactory, LEDGER_ID);

        this.actor = actor;
        this.actor.setIdentity(this.deployer);
    };

    public airdrop = async (amount: bigint, to: Principal) => {
        if (!this.actor) {
            throw new Error("Canister not setup");
        }

        const transferArg: TransferArg = {
            to: {
                owner: to,
                subaccount: [],
            },
            fee: [],
            memo: [],
            from_subaccount: [],
            created_at_time: [],
            amount: BigInt(amount),
        };
        const result = await this.actor.icrc1_transfer(transferArg);

        return result;
    };

    public with_identity(identity: Identity) {
        if (!this.actor) {
            throw new Error("Canister not setup");
        }

        this.actor.setIdentity(identity);
    }

    public async transfer(arg: TransferArg) {
        if (!this.actor) {
            throw new Error("Canister not setup");
        }

        return await this.actor.icrc1_transfer(arg);
    }

    public approve(arg: ApproveArgs) {
        if (!this.actor) {
            throw new Error("Canister not setup");
        }

        return this.actor.icrc2_approve(arg);
    }

    public async balanceOf(account: Account) {
        const actor = this.pic.createActor<_SERVICE>(idlFactory, LEDGER_ID);
        return actor.icrc1_balance_of(account);
    }
}
