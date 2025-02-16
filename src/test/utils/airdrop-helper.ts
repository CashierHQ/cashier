import { Identity } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { Actor, createIdentity, PocketIc } from "@hadronous/pic";
import { resolve } from "path";

import {
    type _SERVICE,
    InitArgs,
    LedgerCanisterPayload,
    init as ledgerInit,
    TransferArg,
} from "../../declarations/icp_ledger_canister/icp_ledger_canister.did";
import { idlFactory } from "../../declarations/icp_ledger_canister/index";
import { principalToAccountIdentifier } from "@dfinity/ledger-icp";
import { IDL } from "@dfinity/candid";

export class AirdropHelper {
    private pic: PocketIc;
    private deployer: Identity;
    private wasm_path: string;
    private actor?: Actor<_SERVICE>;
    constructor(pic: PocketIc) {
        this.pic = pic;
        this.deployer = createIdentity("tokenDeployer");
        this.wasm_path = resolve("artifacts", "token_canister.wasm.gz");
    }

    public setupCanister = async () => {
        const LEDGER_ID = Principal.fromText("x5qut-viaaa-aaaar-qajda-cai");
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

        const canister_id = await this.pic.createCanister({
            cycles: BigInt(1e13),
            sender: this.deployer.getPrincipal(),
            // targetSubnetId: subnetId,
            targetCanisterId: LEDGER_ID,
        });

        await this.pic.installCode({
            wasm: this.wasm_path,
            sender: this.deployer.getPrincipal(),
            canisterId: canister_id,
            // targetSubnetId: subnetId,
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
}
