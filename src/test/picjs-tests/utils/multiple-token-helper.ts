// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

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
} from "../../../../src/cashier_frontend/src/generated/icp_ledger_canister/icp_ledger_canister.did";
import { Account, principalToAccountIdentifier } from "@dfinity/ledger-icp";
import { IDL } from "@dfinity/candid";

export const ICP_LABEL = "ICP";

export class MultipleTokenHelper {
    private pic: PocketIc;
    private deployer: Identity;
    private wasm_path: string;
    private actors: Map<string, Actor<_SERVICE>>;
    private canisterIds: Map<string, Principal>;
    private canisterIdToName: Map<string, string>;
    private identity?: Identity;

    constructor(pic: PocketIc) {
        this.pic = pic;
        this.deployer = createIdentity("tokenDeployer");
        this.wasm_path = resolve("artifacts", "token_canister.wasm.gz");
        this.actors = new Map();
        this.canisterIds = new Map();
        this.canisterIdToName = new Map();
    }

    public getTokenCanisterId = (tokenName: string) => {
        const canisterId = this.canisterIds.get(tokenName);
        if (!canisterId) {
            throw new Error(`Canister for token ${tokenName} not setup`);
        }
        return canisterId;
    };

    public getTokenNameByCanisterId = (canisterId: string | Principal) => {
        const canisterIdStr = typeof canisterId === "string" ? canisterId : canisterId.toString();
        const tokenName = this.canisterIdToName.get(canisterIdStr);
        if (!tokenName) {
            throw new Error(`Token name for canister ${canisterIdStr} not found`);
        }
        return tokenName;
    };

    public getTokenCanisterIds = () => {
        return this.canisterIds;
    };

    public getTokenCanisterIdsArray = () => {
        return Array.from(this.canisterIds.values());
    };

    public getCanisterIdToNameMap = () => {
        return this.canisterIdToName;
    };

    public init = async () => {
        const LEDGER_ID = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

        const init_args: InitArgs = {
            send_whitelist: [],
            token_symbol: [],
            transfer_fee: [],
            minting_account: principalToAccountIdentifier(this.deployer.getPrincipal()),
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

        const subnet = await this.pic.getNnsSubnet();

        const canister_id = await this.pic.createCanister({
            cycles: BigInt(1e13),
            sender: this.deployer.getPrincipal(),
            // targetSubnetId: subnetId,
            targetCanisterId: LEDGER_ID,
            targetSubnetId: subnet?.id,
        });

        await this.pic.installCode({
            wasm: this.wasm_path,
            sender: this.deployer.getPrincipal(),
            canisterId: canister_id,
            // targetSubnetId: subnetId,
            arg: encoded_arg,
        });

        const actor = await this.pic.createActor<_SERVICE>(idlFactory, LEDGER_ID);
        actor.setIdentity(this.deployer);

        this.actors.set(ICP_LABEL, actor);
        this.canisterIds.set(ICP_LABEL, canister_id);
        this.canisterIdToName.set(canister_id.toString(), ICP_LABEL);
    };

    public setupCanister = async (tokenName: string) => {
        const init_args: InitArgs = {
            send_whitelist: [],
            token_symbol: [],
            transfer_fee: [],
            minting_account: principalToAccountIdentifier(this.deployer.getPrincipal()),
            transaction_window: [],
            max_message_size_bytes: [],
            icrc1_minting_account: [],
            archive_options: [],
            initial_values: [],
            token_name: [tokenName],
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

        const canister_id = await this.pic.createCanister({
            cycles: BigInt(1e13),
            sender: this.deployer.getPrincipal(),
        });

        await this.pic.installCode({
            wasm: this.wasm_path,
            sender: this.deployer.getPrincipal(),
            canisterId: canister_id,
            arg: encoded_arg,
        });

        const actor = await this.pic.createActor<_SERVICE>(idlFactory, canister_id);
        actor.setIdentity(this.deployer);

        this.actors.set(tokenName, actor);
        this.canisterIds.set(tokenName, canister_id);
        this.canisterIdToName.set(canister_id.toString(), tokenName);
    };

    public airdrop = async (tokenName: string, amount: bigint, to: Principal) => {
        const actor = this.actors.get(tokenName);
        if (!actor) {
            throw new Error(`Canister for token ${tokenName} not setup`);
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
        const result = await actor.icrc1_transfer(transferArg);

        return result;
    };

    public with_identity(identity: Identity) {
        this.identity = identity;

        for (const actor of this.actors.values()) {
            actor.setIdentity(this.identity);
        }
    }

    public async transfer(tokenName: string, arg: TransferArg) {
        const actor = this.actors.get(tokenName);
        if (!actor) {
            throw new Error(`Canister for token ${tokenName} not setup`);
        }

        return await actor.icrc1_transfer(arg);
    }

    public approve(tokenName: string, arg: ApproveArgs) {
        const actor = this.actors.get(tokenName);
        if (!actor) {
            throw new Error(`Canister for token ${tokenName} not setup`);
        }

        return actor.icrc2_approve(arg);
    }

    public async balanceOf(tokenName: string, account: Account) {
        const actor = this.actors.get(tokenName);
        if (!actor) {
            throw new Error(`Canister for token ${tokenName} not setup`);
        }

        return actor.icrc1_balance_of(account);
    }

    public async feeOf(tokenName: string) {
        const actor = this.actors.get(tokenName);
        if (!actor) {
            throw new Error(`Canister for token ${tokenName} not setup`);
        }

        return actor.icrc1_fee();
    }
}
