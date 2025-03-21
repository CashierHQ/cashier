/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    CreateLinkInput,
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
import { parseResultResponse } from "../utils/parser";
import { TokenHelper } from "../utils/token-helper";
import { Principal } from "@dfinity/principal";
import { flattenAndFindByMethod, Icrc112Executor } from "../utils/icrc-112";

export const WASM_PATH = resolve("artifacts", "cashier_backend.wasm.gz");

describe("Tip Link claim create user", () => {
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
            const createLinkInput: CreateLinkInput = { link_type: "TipLink" };
            const createLinkRes = await actor.create_link(createLinkInput);
            const createLinkParsed = parseResultResponse(createLinkRes);
            linkId = createLinkParsed;

            // Step 2: Transition to add asset
            const updateLinkInput1: UpdateLinkInput = {
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
            const updateLinkRes2 = await actor.update_link(updateLinkInput2);
            const linkUpdated2 = parseResultResponse(updateLinkRes2);
            expect(linkUpdated2.id).toEqual(linkId);
            expect(linkUpdated2.state).toEqual("Link_state_create_link");

            // Step 4: Create action
            const processActionInput: ProcessActionInput = {
                link_id: linkId,
                action_id: "",
                action_type: "CreateLink",
                params: [],
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
                params: [],
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
                fail(`Expected Ok result but got: ${JSON.stringify(res)}`);
            }
        });

        it("Should call process_action success", async () => {
            const res = await actor.process_action({
                action_id: createLinkActionId,
                link_id: linkId,
                action_type: "Claim",
                params: [],
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

            console.log("parsedRes", parsedRes);

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
