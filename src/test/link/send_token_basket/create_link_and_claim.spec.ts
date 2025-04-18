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
import { Actor, createIdentity, PocketIc } from "@hadronous/pic";
import { parseResultResponse } from "../../utils/parser";
import { Principal } from "@dfinity/principal";
import { flattenAndFindByMethod } from "../../utils/icrc-112";
import { MultipleTokenHelper } from "../../utils/multiple-token-helper";
import { Icrc112ExecutorV2 } from "../../utils/icrc-112-v2";

export const WASM_PATH = resolve("artifacts", "cashier_backend.wasm.gz");

describe("Test create token basket and claim", () => {
    let pic: PocketIc;
    let actor: Actor<_SERVICE>;

    const alice = createIdentity("superSecretAlicePassword");
    const bob = createIdentity("superSecretBobPassword");

    let linkId: string;
    let createLinkActionId: string;

    let multiple_token_helper: MultipleTokenHelper;

    let icrc_112_requests: Icrc112Request[][] = [];

    let canister_id: string = "";

    const testPayload = {
        title: "airdopr 10 icp for 10 user",
        description: "tip 20 icp to the user",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "SendTokenBasket",
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

        multiple_token_helper = new MultipleTokenHelper(pic);
        await multiple_token_helper.init();
        await multiple_token_helper.setupCanister("token1");
        await multiple_token_helper.setupCanister("token2");
        await multiple_token_helper.setupCanister("token3");

        await multiple_token_helper.airdrop(
            "feeICP",
            BigInt(1_0000_0000_0000),
            alice.getPrincipal(),
        );
        await multiple_token_helper.airdrop(
            "token1",
            BigInt(1_0000_0000_0000),
            alice.getPrincipal(),
        );
        await multiple_token_helper.airdrop(
            "token2",
            BigInt(1_0000_0000_0000),
            alice.getPrincipal(),
        );
        await multiple_token_helper.airdrop(
            "token3",
            BigInt(1_0000_0000_0000),
            alice.getPrincipal(),
        );

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
            // Step 1: Create link
            const createLinkInput: CreateLinkInput = { link_type: "SendTokenBasket" };
            const createLinkRes = await actor.create_link(createLinkInput);
            const createLinkParsed = parseResultResponse(createLinkRes);
            linkId = createLinkParsed;

            expect(createLinkRes).toHaveProperty("Ok");
        });

        it("Should choose template successfully", async () => {
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
        });

        it("Should add assets successfully", async () => {
            // Step 3: Add assets
            const assets = [
                {
                    chain: "IC",
                    address: multiple_token_helper.getTokenCanisterId("token1").toString(),
                    label:
                        "SEND_TOKEN_BASKET_ASSET" +
                        "_" +
                        multiple_token_helper.getTokenCanisterId("token1").toString(),
                    payment_amount: [] as [],
                    amount_per_link_use_action: BigInt(10_0000_0000),
                },
                {
                    chain: "IC",
                    address: multiple_token_helper.getTokenCanisterId("token2").toString(),
                    label:
                        "SEND_TOKEN_BASKET_ASSET" +
                        "_" +
                        multiple_token_helper.getTokenCanisterId("token2").toString(),
                    payment_amount: [] as [],
                    amount_per_link_use_action: BigInt(20_0000_0000),
                },
                {
                    chain: "IC",
                    address: multiple_token_helper.getTokenCanisterId("token3").toString(),
                    label:
                        "SEND_TOKEN_BASKET_ASSET" +
                        "_" +
                        multiple_token_helper.getTokenCanisterId("token3").toString(),
                    payment_amount: [] as [],
                    amount_per_link_use_action: BigInt(30_0000_0000),
                },
            ];

            const updateLinkInput2: UpdateLinkInput = {
                id: linkId,
                action: "Continue",
                params: [
                    {
                        title: [],
                        asset_info: [assets],
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
        });

        it("Should create link successfully", async () => {
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
        });

        it("Should confirm action successfully", async () => {
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
            const executeHelper = new Icrc112ExecutorV2(
                icrc_112_requests,
                multiple_token_helper,
                alice,
                linkId,
                createLinkActionId,
                Principal.fromText(canister_id),
                actor,
                triggerTxMethod.nonce[0]!,
            );
            await executeHelper.executeIcrc1Transfer("token1", 10_0000_0000n);
            await executeHelper.executeIcrc1Transfer("token2", 20_0000_0000n);
            await executeHelper.executeIcrc1Transfer("token3", 30_0000_0000n);
            await executeHelper.executeIcrc2Approve("feeICP", 30_0000_0000n);
            await actor.update_action({
                action_id: createLinkActionId,
                link_id: linkId,
                external: true,
            });
            await executeHelper.triggerTransaction();
        });

        it("Should be success after executing", async () => {
            // Step 7: Verify final state
            const getLinkOptions: GetLinkOptions = { action_type: "CreateLink" };
            const getActionRes = await actor.get_link(linkId, [getLinkOptions]);
            const finalRes = parseResultResponse(getActionRes);
            const finalActionDto = finalRes.action[0]!;

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

    describe("With Bob", () => {
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
                action_id: createLinkActionId,
                link_id: linkId,
                action_type: "Claim",
            });

            expect(res).toHaveProperty("Ok");
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
    });
});
//
