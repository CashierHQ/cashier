import {
    CreateLinkInput,
    UserDto,
    IntentDto,
    ProcessActionInput,
    UpdateLinkInput,
    type _SERVICE,
    GetLinkOptions,
    idlFactory,
} from "../../../declarations/cashier_backend/cashier_backend.did";

import { resolve } from "path";
import { Actor, createIdentity, PocketIc } from "@hadronous/pic";
import { parseResultResponse } from "../../utils/parser";
import { TokenHelper } from "../../utils/token-helper";

export const WASM_PATH = resolve("artifacts", "cashier_backend.wasm.gz");

describe("Tip link timeout action", () => {
    let pic: PocketIc;
    let actor: Actor<_SERVICE>;

    const alice = createIdentity("superSecretAlicePassword");
    let user: UserDto;

    let linkId: string;
    let createLinkActionId: string;

    let airdropHelper: TokenHelper;

    const testPayload = {
        title: "tip 20 icp",
        description: "tip 20 icp to the user",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "SendTip",
    };

    const assetInfoTest = {
        chain: "IC",
        address: "x5qut-viaaa-aaaar-qajda-cai",
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

        actor = fixture.actor;

        actor.setIdentity(alice);

        // init seed for RNG
        await pic.advanceTime(7 * 60 * 1000);
        await pic.tick(50);

        // create user snd airdrop
        const create_user_res = await actor.create_user();
        user = parseResultResponse(create_user_res);

        airdropHelper = new TokenHelper(pic);
        await airdropHelper.setupCanister();

        await airdropHelper.airdrop(BigInt(1_0000_0000_0000), alice.getPrincipal());

        await pic.advanceTime(5 * 60 * 1000);
        await pic.tick(50);
    });

    afterAll(async () => {
        await pic.tearDown();
    });

    beforeEach(async () => {
        await pic.advanceTime(6 * 60 * 1000);
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

        expect(actionDto.id).toEqual(createLinkActionId);
        expect(actionDto.state).toEqual("Action_state_processing");

        actionDto.intents.forEach((intent: IntentDto) => {
            expect(intent.state).toEqual("Intent_state_processing");
        });
    });

    it("Should timeout", async () => {
        const input: GetLinkOptions = {
            action_type: "CreateLink",
        };

        const getActionRes = await actor.get_link(linkId, [input]);
        const res = parseResultResponse(getActionRes);

        expect(res.link.id).toEqual(linkId);
        expect(res.action).toHaveLength(1);
        expect(res.action[0]!.id).toEqual(createLinkActionId);
        expect(res.action[0]!.state).toEqual("Action_state_fail");
        res.action[0]!.intents.forEach((intent: IntentDto) => {
            expect(intent.state).toEqual("Intent_state_fail");
        });
    });
});
//
