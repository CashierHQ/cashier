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
import { fromNullable } from "@dfinity/utils";

export const WASM_PATH = resolve("artifacts", "cashier_backend.wasm.gz");

describe("Send tip claim anonymous", () => {
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
        title: "tip 20 icp",
        description: "tip 20 icp to the user",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "SendTip",
    };

    const assetInfoTest = {
        chain: "IC",
        address: FEE_CANISTER_ID,
        amount_per_claim: BigInt(10_0000_0000),
        total_amount: BigInt(10_0000_0000),
    };

    beforeAll(async () => {
        pic = await PocketIc.create(process.env.PIC_URL);
        const currentTime = new Date(1734434601000);

        await pic.setTime(currentTime.getTime());
        await pic.tick(1);

        const fixture = await pic.setupCanister<_SERVICE>({
            idlFactory,
            wasm: WASM_PATH,
        });

        canister_id = fixture.canisterId.toString();

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
        it("should complete the entire process from link creation to executing icrc-112", async () => {
            // Step 1: Create link
            const createLinkInput: CreateLinkInput = { link_type: "SendTip" };
            const createLinkRes = await actor.create_link(createLinkInput);
            const createLinkParsed = parseResultResponse(createLinkRes);
            linkId = createLinkParsed;

            // Step 2: Transition to add asset
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

            // Step 3: Transition to create link
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
                                    label: "SEND_TIP_ASSET",
                                    amount_per_link_use_action: assetInfoTest.amount_per_claim,
                                },
                            ],
                        ],
                        description: [],
                        template: [],
                        link_image_url: [],
                        nft_image: [],
                        link_type: [],
                        link_use_action_max_count: [1n],
                    },
                ],
            };
            const updateLinkRes2 = await actor.update_link(updateLinkInput2);
            const linkUpdated2 = parseResultResponse(updateLinkRes2);
            expect(linkUpdated2.id).toEqual(linkId);
            expect(linkUpdated2.state).toEqual("Link_state_create_link");

            // Step 4: Create action
            const processActionInput: ProcessActionInput = {
                link_id: linkId,
                action_id: "",
                action_type: "CreateLink",
            };
            const createActionRes = await actor.process_action(processActionInput);
            const actionRes = parseResultResponse(createActionRes);
            createLinkActionId = actionRes.id;
            expect(actionRes.state).toEqual("Action_state_created");

            // Step 5: Confirm action
            const confirmActionInput: ProcessActionInput = {
                link_id: linkId,
                action_id: createLinkActionId,
                action_type: "CreateLink",
            };
            const confirmRes = await actor.process_action(confirmActionInput);
            const confirmActionDto = parseResultResponse(confirmRes);
            icrc_112_requests = confirmActionDto.icrc_112_requests[0]!;
            expect(confirmActionDto.state).toEqual("Action_state_processing");

            // Step 6: Execute icrc-112 requests
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
            await executeHelper.executeIcrc1Transfer();
            await executeHelper.executeIcrc2Approve();
            await actor.update_action({
                action_id: createLinkActionId,
                link_id: linkId,
                external: true,
            });
            await executeHelper.triggerTransaction();

            // Step 7: Verify final state
            const getLinkOptions: GetLinkOptions = { action_type: "CreateLink" };
            const getActionRes = await actor.get_link(linkId, [getLinkOptions]);
            const finalRes = parseResultResponse(getActionRes);
            const finalActionDto = finalRes.action[0]!;

            expect(createLinkRes).toHaveProperty("Ok");

            expect(finalActionDto.state).toEqual("Action_state_success");
            finalActionDto.intents.forEach((intent: IntentDto) => {
                expect(intent.state).toEqual("Intent_state_success");
            });

            // change link state to active
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

    describe("With anonymous", () => {
        let anonymous_actor: Actor<_SERVICE>;
        let claimActionId: string;
        beforeAll(async () => {
            anonymous_actor = await pic.createActor<_SERVICE>(
                idlFactory,
                Principal.fromText(canister_id),
            );
        });

        it("Should return empty if there is no action yet", async () => {
            const res = await anonymous_actor.link_get_user_state({
                link_id: linkId,
                action_type: "Claim",
                anonymous_wallet_address: [bob.getPrincipal().toText()],
            });

            expect(res).toHaveProperty("Ok");
            if ("Ok" in res) {
                expect(res.Ok).toEqual([]);
            } else {
                throw new Error("Expected Ok in response");
            }
        });

        it("Should call process_action_anonymous success", async () => {
            const res = await anonymous_actor.process_action_anonymous({
                action_id: "",
                link_id: linkId,
                action_type: "Claim",
                wallet_address: bob.getPrincipal().toText(),
            });

            const parsedRes = parseResultResponse(res);
            claimActionId = parsedRes.id;

            expect(res).toHaveProperty("Ok");
        });

        it("Should return user state", async () => {
            const res = await anonymous_actor.link_get_user_state({
                link_id: linkId,
                action_type: "Claim",
                anonymous_wallet_address: [bob.getPrincipal().toText()],
            });
            const parsedRes = parseResultResponse(res);

            expect(res).toHaveProperty("Ok");
            if (parsedRes[0]) {
                expect(parsedRes[0].link_user_state).toEqual("User_state_choose_wallet");
                expect(parsedRes[0].action.state).toEqual("Action_state_created");
                expect(parsedRes[0].action.type).toEqual("Claim");
            } else {
                throw new Error("Expected Ok in response");
            }
        });

        it("Should change be success after call process_action_anonymous", async () => {
            const tokenHelper = new TokenHelper(pic);
            const bobAccount = {
                owner: bob.getPrincipal(),
                subaccount: [] as any,
            };
            const balanceBefore = await tokenHelper.balanceOf(bobAccount);
            const res = await anonymous_actor.process_action_anonymous({
                action_id: claimActionId,
                link_id: linkId,
                action_type: "Claim",
                wallet_address: bob.getPrincipal().toText(),
            });
            const parsedRes = parseResultResponse(res);
            const balanceAfter = await tokenHelper.balanceOf(bobAccount);
            const get_link_res = await actor.get_link(linkId, []);
            const parsed_res = parseResultResponse(get_link_res);

            expect(res).toHaveProperty("Ok");
            expect(parsedRes.state).toEqual("Action_state_success");
            expect(parsedRes.intents[0].state).toEqual("Intent_state_success");
            expect(balanceBefore).toEqual(BigInt(0));
            // minus fee
            expect(balanceAfter).toEqual(assetInfoTest.amount_per_claim - BigInt(10_000));
            const asset_info = fromNullable(parsed_res.link.asset_info);
            expect(asset_info).toHaveLength(1);
            expect(parsed_res.link.link_use_action_counter).toEqual(1n);
        });

        it("Should update to complete claim", async () => {
            const res = await anonymous_actor.link_update_user_state({
                link_id: linkId,
                action_type: "Claim",
                goto: "Continue",
                anonymous_wallet_address: [bob.getPrincipal().toText()],
            });
            const parsedRes = parseResultResponse(res);

            expect(res).toHaveProperty("Ok");
            if (parsedRes[0]) {
                expect(parsedRes[0].link_user_state).toEqual("User_state_completed_link");
                expect(parsedRes[0].action.state).toEqual("Action_state_success");
                expect(parsedRes[0].action.type).toEqual("Claim");
            } else {
                throw new Error("Expected Ok in response");
            }
        });
    });
});
//
