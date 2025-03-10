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
} from "../../declarations/cashier_backend/cashier_backend.did";

import { idlFactory } from "../../declarations/cashier_backend/index";
import { resolve } from "path";
import { Actor, createIdentity, PocketIc } from "@hadronous/pic";
import { parseResultResponse, safeParseJSON } from "../utils/parser";
import { TokenHelper } from "../utils/token-helper";

import { Principal } from "@dfinity/principal";
import { flattenAndFindByMethod, Icrc112Executor } from "../utils/icrc-112";

export const WASM_PATH = resolve("artifacts", "cashier_backend.wasm.gz");

describe("Link", () => {
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
        link_type: "TipLink",
    };

    const assetInfoTest = {
        chain: "IC",
        address: "x5qut-viaaa-aaaar-qajda-cai",
        amount_per_claim: BigInt(100),
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
                link_type: "TipLink",
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
                    Update: {
                        title: [testPayload.title],
                        asset_info: [],
                        description: [testPayload.description],
                        template: [testPayload.template],
                        link_image_url: [testPayload.link_image_url],
                        nft_image: [],
                        link_type: [testPayload.link_type],
                    },
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
                    Update: {
                        title: [],
                        asset_info: [
                            [
                                {
                                    chain: assetInfoTest.chain,
                                    address: assetInfoTest.address,
                                    amount_per_claim: assetInfoTest.amount_per_claim,
                                    total_amount: assetInfoTest.total_amount,
                                    label: "1000",
                                },
                            ],
                        ],
                        description: [],
                        template: [],
                        link_image_url: [],
                        nft_image: [],
                        link_type: [],
                    },
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
            params: [],
        };

        const createActionRes = await actor.process_action(input);
        const link = await actor.get_link(linkId, []);
        const linkRes = parseResultResponse(link);
        const actionRes = parseResultResponse(createActionRes);

        console.log("actionRes", safeParseJSON(actionRes as any));

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
            params: [],
        };

        const confirmRes = await actor.process_action(input);

        const actionDto = parseResultResponse(confirmRes);

        icrc_112_requests = actionDto.icrc_112_requests[0]!;

        console.log("icrc_request 112", JSON.stringify(icrc_112_requests, null, 2));

        expect(actionDto.id).toEqual(createLinkActionId);
        expect(actionDto.state).toEqual("Action_state_processing");

        actionDto.intents.forEach((intent: IntentDto) => {
            expect(intent.state).toEqual("Intent_state_processing");
        });
    });

    // In product, after confirm, it should use icrc-112, but PicJs does not support http agent call yet
    // This is is mimic the icrc-112 call not the actual call
    it("should be fail after only execute icrc1_transfer", async () => {
        const trigger_tx_method = flattenAndFindByMethod(icrc_112_requests, "trigger_transaction");

        if (!trigger_tx_method || !trigger_tx_method.nonce[0]) {
            throw new Error("trigger_transaction method not found");
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

        // simulate time pass 5 minutes
        await pic.advanceTime(5 * 60 * 1000);
        await pic.tick(50);

        const input: GetLinkOptions = {
            action_type: "CreateLink",
        };

        const getActionRes = await actor.get_link(linkId, [input]);
        const res = parseResultResponse(getActionRes);

        const actionDto = res.action[0]!;

        expect(res.link.id).toEqual(linkId);
        expect(actionDto.state).toEqual("Action_state_fail");
        expect(actionDto.intents).toHaveLength(2);

        const expected_states = ["Intent_state_fail", "Intent_state_success"];
        expected_states.sort();
        const actual_states = actionDto.intents.map((intent) => intent.state);
        actual_states.sort();
        expect(actual_states).toEqual(expected_states);
    });

    it("should retry icrc2_approve to Processing", async () => {
        const input: ProcessActionInput = {
            link_id: linkId,
            action_id: createLinkActionId,
            action_type: "CreateLink",
            params: [],
        };

        const confirmRes = await actor.process_action(input);
        const actionDto = parseResultResponse(confirmRes);

        icrc_112_requests = actionDto.icrc_112_requests[0]!;

        console.log("icrc_request", JSON.stringify(icrc_112_requests, null, 2));

        expect(actionDto.id).toEqual(createLinkActionId);
        expect(actionDto.state).toEqual("Action_state_processing");
        const expected_states = ["Intent_state_processing", "Intent_state_success"];
        expected_states.sort();
        const actual_states = actionDto.intents.map((intent) => intent.state);
        actual_states.sort();
        expect(actual_states).toEqual(expected_states);
        expect(icrc_112_requests).toHaveLength(2);
        expect(icrc_112_requests[0]).toHaveLength(1);
        expect(icrc_112_requests[1]).toHaveLength(1);
    });

    // In product, after confirm, it should use icrc-112, but PicJs does not support http agent call yet
    // This is is mimic the icrc-112 call not the actual call
    it("should be success after retry icrc2_approve", async () => {
        const trigger_tx_method = flattenAndFindByMethod(icrc_112_requests, "trigger_transaction");

        if (!trigger_tx_method || !trigger_tx_method.nonce[0]) {
            throw new Error("trigger_transaction method not found");
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

        await execute_helper.executeIcrc2Approve();
        await execute_helper.triggerTransaction();

        const update_action_res = await actor.update_action({
            action_id: createLinkActionId,
            link_id: linkId,
            external: true,
        });

        console.log("update_action_res", safeParseJSON(update_action_res as any));

        const input: GetLinkOptions = {
            action_type: "CreateLink",
        };

        const getActionRes = await actor.get_link(linkId, [input]);
        const res = parseResultResponse(getActionRes);

        const actionDto = res.action[0]!;

        console.log("getActionRes", safeParseJSON(res as any));

        expect(res.link.id).toEqual(linkId);
        expect(actionDto.state).toEqual("Action_state_success");
        expect(actionDto.intents).toHaveLength(2);

        const expected_states = ["Intent_state_success", "Intent_state_success"];
        expected_states.sort();
        const actual_states = actionDto.intents.map((intent) => intent.state);
        actual_states.sort();
        expect(actual_states).toEqual(expected_states);
    });
});
//
