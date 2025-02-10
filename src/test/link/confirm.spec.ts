// Import generated types for your canister
import {
    CreateLinkInput,
    GetLinkOptions,
    IntentDto,
    ProcessActionInput,
    UpdateLinkInput,
    type _SERVICE,
} from "../../declarations/cashier_backend/cashier_backend.did";
import { getIdentity } from "../utils/wallet";
import { ActorSubclass } from "@dfinity/agent";
import { parseResultResponse } from "../utils/parser";
import { ActorManager } from "../utils/service";

// Define the path to your canister's WASM file
// export const WASM_PATH = resolve(
//     "target",
//     "wasm32-unknown-unknown",
//     "release",
//     "cashier_backend.wasm",
// );

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
    total_amount: BigInt(100),
};

// The `describe` function is used to group tests together
// and is completely optional.
describe("Link", () => {
    // Define variables to hold our PocketIC instance, canister ID,
    // and an actor to interact with our canister.
    // let pic: PocketIc;
    // let canisterId: Principal;
    let actor: ActorSubclass<_SERVICE>;

    const identity1 = getIdentity("user1");

    let actorManager: ActorManager;

    let linkId: string;
    let userId: string;
    let createLinkActionId: string;

    // The `beforeEach` hook runs before each test.
    //
    // This can be replaced with a `beforeAll` hook to persist canister
    // state between tests.
    beforeAll(async () => {
        // create a new PocketIC instance
        // pic = await PocketIc.create(process.env.PIC_URL);

        // // Setup the canister and actor
        // const fixture = await pic.setupCanister<_SERVICE>({
        //     idlFactory,
        //     wasm: WASM_PATH,
        // });

        // Save the actor and canister ID for use in tests
        actorManager = new ActorManager({
            canisterId: "jjio5-5aaaa-aaaam-adhaq-cai",
            identity: identity1,
        });

        actor = await actorManager.initBackendActor();

        const user = await actor.get_user();

        if ("Err" in user) {
            const createdUser = await actor.create_user();
            const res = parseResultResponse(createdUser);
            userId = res.id;
        } else {
            userId = user.Ok.id;
        }

        console.log("userId", userId);
    });

    // The `afterEach` hook runs after each test.
    //
    // This should be replaced with an `afterAll` hook if you use
    // a `beforeAll` hook instead of a `beforeEach` hook.
    // afterEach(async () => {
    //     // tear down the PocketIC instance
    //     await pic.tearDown();
    // });

    it("should create link success", async () => {
        const input: CreateLinkInput = {
            link_type: "TipLink",
        };

        const createLinkRes = await actor.create_link(input);
        linkId = parseResultResponse(createLinkRes);
        const getLinkRes = await actor.get_link(linkId, []);
        const res = parseResultResponse(getLinkRes);

        // Assert
        expect(createLinkRes).toHaveProperty("Ok");
        expect(res.link.state).toEqual("Link_state_choose_link_type");
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
        createLinkActionId = actionRes.id;

        console.log("createLinkActionId", actionRes);

        expect(actionRes.creator).toEqual(userId);
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

        console.log("getActionRes", res);

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

        console.log("dto", actionDto);

        expect(actionDto.id).toEqual(createLinkActionId);
    });
});
