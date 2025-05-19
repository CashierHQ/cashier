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
    UserDto,
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

export const WASM_PATH = resolve("artifacts", "cashier_backend.wasm.gz");

describe("Tip Link confirm action success", () => {
    let pic: PocketIc;
    let actor: Actor<_SERVICE>;

    const alice = createIdentity("superSecretAlicePassword");
    let user: UserDto;

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

        // create user snd airdrop
        const create_user_res = await actor.create_user();
        user = parseResultResponse(create_user_res);

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
        it("should create link success", async () => {
            const input: CreateLinkInput = {
                link_type: "SendTip",
            };

            const createLinkRes = await actor.create_link(input);
            const res = parseResultResponse(createLinkRes);

            linkId = res;

            expect(createLinkRes).toHaveProperty("Ok");
        });
    });

    it("should transition from choose tempalte to add asset success", async () => {
        const linkInput: UpdateLinkInput = {
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

        const updateLinkRes = await actor.update_link(linkInput);
        const linkUpdated = parseResultResponse(updateLinkRes);

        expect(linkUpdated.id).toEqual(linkId);
        expect(linkUpdated.title).toEqual([testPayload.title]);
        expect(linkUpdated.link_type).toEqual([testPayload.link_type]);
        expect(linkUpdated.state).toEqual("Link_state_add_assets");
    });

    it("should transition from add asset to create link", async () => {
        const linkInput: UpdateLinkInput = {
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

        const updateLinkRes = await actor.update_link(linkInput);
        const linkUpdated = parseResultResponse(updateLinkRes);

        expect(linkUpdated.id).toEqual(linkId);
        expect(linkUpdated.asset_info).toHaveLength(1);
        expect(linkUpdated.state).toEqual("Link_state_create_link");
    });

    it("should create action CreateLink success", async () => {
        const input: ProcessActionInput = {
            link_id: linkId,
            action_id: "",
            action_type: "CreateLink",
        };

        const createActionRes = await actor.process_action(input);
        const link = await actor.get_link(linkId, []);
        const linkRes = parseResultResponse(link);
        const actionRes = parseResultResponse(createActionRes);

        createLinkActionId = actionRes.id;

        expect(actionRes.creator).toEqual(user.id);
        expect(actionRes.intents).toHaveLength(2);
        expect(linkRes.link.state).toEqual("Link_state_create_link");

        // Check the state of all intents
        actionRes.intents.forEach((intent: IntentDto) => {
            expect(intent.state).toEqual("Intent_state_created");
        });
    });

    it("should get action success", async () => {
        const input: GetLinkOptions = {
            action_type: "CreateLink",
        };

        const getActionRes = await actor.get_link(linkId, [input]);
        const res = parseResultResponse(getActionRes);

        expect(res.link.id).toEqual(linkId);
        expect(res.action).toHaveLength(1);
        expect(res.action[0]!.id).toEqual(createLinkActionId);
    });

    it("should confirm action success", async () => {
        const input: ProcessActionInput = {
            link_id: linkId,
            action_id: createLinkActionId,
            action_type: "CreateLink",
        };

        const confirmRes = await actor.process_action(input);
        const actionDto = parseResultResponse(confirmRes);

        icrc_112_requests = actionDto.icrc_112_requests[0]!;

        expect(actionDto.id).toEqual(createLinkActionId);
        expect(actionDto.state).toEqual("Action_state_processing");

        actionDto.intents.forEach((intent: IntentDto) => {
            expect(intent.state).toEqual("Intent_state_processing");
        });
    });

    // In product, after confirm, it should use icrc-112, but PicJs does not support http agent call yet
    // This is is mimic the icrc-112 call not the actual call
    it("should be success after executing the icrc-112 request", async () => {
        const trigger_tx_method = flattenAndFindByMethod(icrc_112_requests, "trigger_transaction");

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

        await execute_helper.executeIcrc1Transfer();

        await execute_helper.executeIcrc2Approve();

        await actor.update_action({
            action_id: createLinkActionId,
            link_id: linkId,
            external: true,
        });

        await execute_helper.triggerTransaction();

        const input: GetLinkOptions = {
            action_type: "CreateLink",
        };

        const getActionRes = await actor.get_link(linkId, [input]);
        const res = parseResultResponse(getActionRes);

        const actionDto = res.action[0]!;

        expect(res.link.id).toEqual(linkId);
        expect(actionDto.state).toEqual("Action_state_success");

        actionDto.intents.forEach((intent: IntentDto) => {
            expect(intent.state).toEqual("Intent_state_success");
        });
    });
});
//
