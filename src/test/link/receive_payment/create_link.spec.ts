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

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    CreateLinkInput,
    IntentDto,
    ProcessActionInput,
    UpdateLinkInput,
    type _SERVICE,
    GetLinkOptions,
    Icrc112Request,
    idlFactory,
} from "../../../declarations/cashier_backend/cashier_backend.did";

import { resolve } from "path";
import { Actor, createIdentity, PocketIc } from "@dfinity/pic";
import { parseResultResponse } from "../../utils/parser";
import { TokenHelper } from "../../utils/token-helper";
import { Principal } from "@dfinity/principal";
import { flattenAndFindByMethod, Icrc112Executor } from "../../utils/icrc-112";
import { BACKEND_CANISTER_ID } from "../../constant";
import { toNullable } from "@dfinity/utils";
import LinkHelper from "../../utils/link-helper";

export const WASM_PATH = resolve("artifacts", "cashier_backend.wasm.gz");

describe("Test create airdrop and claim", () => {
    let pic: PocketIc;
    let actor: Actor<_SERVICE>;

    const alice = createIdentity("superSecretAlicePassword");
    const bob = createIdentity("superSecretBobPassword");

    let linkId: string;
    let createLinkActionId: string;

    let token_helper: TokenHelper;

    let icrc_112_requests: Icrc112Request[][] = [];

    let canister_id: string = "";

    const testPayload = {
        title: "ReceivePayment",
        description: "ReceivePayment",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "ReceivePayment",
    };

    const assetInfoTest = {
        chain: "IC",
        address: FEE_CANISTER_ID,
        payment_amount: BigInt(1_0000_0000),
        // total 10
        label: "RECEIVE_PAYMENT_ASSET",
    };

    beforeAll(async () => {
        pic = await PocketIc.create(process.env.PIC_URL);
        const currentTime = new Date(1734434601000);

        await pic.setTime(currentTime.getTime());
        await pic.tick(1);

        const fixture = await pic.setupCanister<_SERVICE>({
            idlFactory,
            wasm: WASM_PATH,
            targetCanisterId: Principal.fromText(BACKEND_CANISTER_ID),
        });

        canister_id = fixture.canisterId.toString();

        console.log("canister_id", canister_id);

        actor = fixture.actor;

        actor.setIdentity(alice);

        // init seed for RNG
        await pic.advanceTime(1 * 60 * 1000);
        await pic.tick(50);

        await actor.create_user();
        actor.setIdentity(bob);
        await actor.create_user();

        // create user snd airdrop

        token_helper = new TokenHelper(pic);
        await token_helper.setupCanister();

        await token_helper.airdrop(BigInt(1_0000_0000_0000), alice.getPrincipal());
        await token_helper.airdrop(BigInt(1_0000_0000_0000), bob.getPrincipal());

        await pic.advanceTime(5 * 60 * 1000);
        await pic.tick(50);
    });

    afterAll(async () => {
        await pic.tearDown();
    });

    beforeEach(async () => {
        await pic.advanceTime(1 * 60 * 1000);
        await pic.tick(50);
    });

    describe("With Alice", () => {
        beforeAll(async () => {
            actor.setIdentity(alice);
        });

        it("Should create link successfully", async () => {
            const createLinkInput: CreateLinkInput = { link_type: "SendAirdrop" };
            const createLinkRes = await actor.create_link(createLinkInput);
            const createLinkParsed = parseResultResponse(createLinkRes);
            linkId = createLinkParsed;

            expect(createLinkRes).toHaveProperty("Ok");
        });

        it("Should choose template successfully", async () => {
            const updateLinkInput1: UpdateLinkInput = {
                id: linkId,
                action: "Continue",
                params: [
                    {
                        title: [testPayload.title],
                        asset_info: [],
                        description: [],
                        template: [testPayload.template],
                        link_image_url: [],
                        nft_image: [],
                        link_type: [testPayload.link_type],
                        link_use_action_max_count: [],
                    },
                ],
            };
            const updateLinkRes1 = await actor.update_link(updateLinkInput1);
            const linkUpdated1 = parseResultResponse(updateLinkRes1);

            expect(linkUpdated1.id).toEqual(linkId);
            expect(linkUpdated1.state).toEqual("Link_state_add_assets");
        });

        it("Should add assets successfully", async () => {
            const updateLinkInput2: UpdateLinkInput = {
                id: linkId,
                action: "Continue",
                params: [
                    {
                        title: [],
                        asset_info: [
                            [
                                {
                                    chain: assetInfoTest.chain,
                                    address: assetInfoTest.address,
                                    label: assetInfoTest.label,
                                    amount_per_link_use_action: assetInfoTest.payment_amount,
                                },
                            ],
                        ],
                        description: [],
                        template: [],
                        link_image_url: [],
                        nft_image: [],
                        link_type: [],
                        link_use_action_max_count: toNullable(1n),
                    },
                ],
            };
            const updateLinkRes2 = await actor.update_link(updateLinkInput2);
            const linkUpdated2 = parseResultResponse(updateLinkRes2);

            expect(linkUpdated2.id).toEqual(linkId);
            expect(linkUpdated2.state).toEqual("Link_state_create_link");
        });

        it("Should create action successfully", async () => {
            const processActionInput: ProcessActionInput = {
                link_id: linkId,
                action_id: "",
                action_type: "CreateLink",
            };
            const createActionRes = await actor.process_action(processActionInput);
            const actionRes = parseResultResponse(createActionRes);
            createLinkActionId = actionRes.id;

            expect(actionRes.state).toEqual("Action_state_created");
        });

        it("Should confirm action successfully", async () => {
            const confirmActionInput: ProcessActionInput = {
                link_id: linkId,
                action_id: createLinkActionId,
                action_type: "CreateLink",
            };
            const confirmRes = await actor.process_action(confirmActionInput);
            const confirmActionDto = parseResultResponse(confirmRes);
            icrc_112_requests = confirmActionDto.icrc_112_requests[0]!;

            expect(confirmActionDto.state).toEqual("Action_state_processing");
        });

        it("Should execute icrc-112 requests successfully", async () => {
            const triggerTxMethod = flattenAndFindByMethod(
                icrc_112_requests,
                "trigger_transaction",
            );
            if (!triggerTxMethod) {
                throw new Error("trigger_transaction method not found in icrc-112 requests");
            }
            const executeHelper = new Icrc112Executor(
                icrc_112_requests,
                token_helper,
                alice,
                linkId,
                createLinkActionId,
                Principal.fromText(canister_id),
                actor,
                triggerTxMethod.nonce[0]!,
            );
            await executeHelper.executeIcrc2Approve();
            await actor.update_action({
                action_id: createLinkActionId,
                link_id: linkId,
                external: true,
            });
            await executeHelper.triggerTransaction();

            const link_helper = new LinkHelper(pic);
            link_helper.setupActor(FEE_CANISTER_ID);

            const balanceOfLink = await link_helper.checkAccountBalanceWithSubAccount(
                FEE_CANISTER_ID,
                linkId,
            );

            expect(balanceOfLink).toEqual(BigInt(0));
        });

        it("Should verify final state successfully", async () => {
            const getLinkOptions: GetLinkOptions = { action_type: "CreateLink" };
            const getActionRes = await actor.get_link(linkId, [getLinkOptions]);
            const finalRes = parseResultResponse(getActionRes);
            const finalActionDto = finalRes.action[0]!;

            expect(finalActionDto.state).toEqual("Action_state_success");
            finalActionDto.intents.forEach((intent: IntentDto) => {
                expect(intent.state).toEqual("Intent_state_success");
            });

            const linkInput: UpdateLinkInput = {
                id: linkId,
                action: "Continue",
                params: [],
            };

            const updateLinkRes = await actor.update_link(linkInput);
            const linkUpdated = parseResultResponse(updateLinkRes);

            expect(linkUpdated.id).toEqual(linkId);
            expect(linkUpdated.asset_info).toHaveLength(1);
            expect(linkUpdated.state).toEqual("Link_state_active");
        });
    });

    describe("With Bob", () => {
        let claimActionId: string;
        beforeAll(async () => {
            actor.setIdentity(bob);
        });

        it("Should return empty if there is no action yet", async () => {
            const res = await actor.link_get_user_state({
                link_id: linkId,
                action_type: "Claim",
                anonymous_wallet_address: [],
            });

            expect(res).toHaveProperty("Ok");
            if ("Ok" in res) {
                expect(res.Ok).toEqual([]);
            } else {
                // Optional: Better error message if test fails
                throw new Error("Expected Ok in response");
            }
        });

        it("Should call process_action success", async () => {
            const res = await actor.process_action({
                action_id: "",
                link_id: linkId,
                action_type: "Claim",
            });

            expect(res).toHaveProperty("Ok");

            if ("Ok" in res) {
                claimActionId = res.Ok.id;
            }
        });

        it("Should return user state", async () => {
            const res = await actor.link_get_user_state({
                link_id: linkId,
                action_type: "Claim",
                anonymous_wallet_address: [],
            });
            const parsedRes = parseResultResponse(res);

            expect(res).toHaveProperty("Ok");
            if (parsedRes[0]) {
                expect(parsedRes[0].link_user_state).toEqual("User_state_choose_wallet");
                expect(parsedRes[0].action.state).toEqual("Action_state_created");
                expect(parsedRes[0].action.type).toEqual("Claim");
            } else {
                fail(`Expected index 0 have record: ${JSON.stringify(res)}`);
            }
        });

        it("should confirm action success", async () => {
            const input: ProcessActionInput = {
                link_id: linkId,
                action_id: claimActionId,
                action_type: "Claim",
            };

            const confirmRes = await actor.process_action(input);
            const actionDto = parseResultResponse(confirmRes);

            const requestToExecute = actionDto.icrc_112_requests[0]!;

            expect(requestToExecute).toHaveLength(1);

            expect(actionDto.id).toEqual(claimActionId);
            expect(actionDto.state).toEqual("Action_state_processing");

            actionDto.intents.forEach((intent: IntentDto) => {
                expect(intent.state).toEqual("Intent_state_processing");
            });
        });

        it("should be success after executing the icrc-112 request", async () => {
            const trigger_tx_method = flattenAndFindByMethod(
                icrc_112_requests,
                "trigger_transaction",
            );

            if (!trigger_tx_method) {
                throw new Error("trigger_transaction method not found in icrc-112 requests");
            }

            const execute_helper = new Icrc112Executor(
                icrc_112_requests,
                token_helper,
                alice,
                linkId,
                createLinkActionId,
                Principal.fromText(canister_id),
                actor,
                trigger_tx_method.nonce[0]!,
            );

            await execute_helper.executeIcrc1Transfer(BigInt(1_0000_0000));
            await actor.update_action({
                action_id: claimActionId,
                link_id: linkId,
                external: true,
            });

            const link_helper = new LinkHelper(pic);
            link_helper.setupActor(FEE_CANISTER_ID);

            const balanceOfLink = await link_helper.checkAccountBalanceWithSubAccount(
                "jjio5-5aaaa-aaaam-adhaq-cai",
                linkId,
            );

            const res = await actor.link_get_user_state({
                link_id: linkId,
                action_type: "Claim",
                anonymous_wallet_address: [],
            });
            const parsedRes = parseResultResponse(res);

            expect(balanceOfLink).toEqual(BigInt(1_0000_0000));
            expect(parsedRes[0]?.action.state).toEqual("Action_state_success");
            if (parsedRes[0]?.action.intents) {
                for (const intent of parsedRes[0]?.action.intents) {
                    expect(intent.state).toEqual("Intent_state_success");
                }
            }
        });
    });
});
//
