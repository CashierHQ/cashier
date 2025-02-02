// Import generated types for your canister
import {
    CreateLinkInput,
    UpdateLinkInput,
    type _SERVICE,
} from "../../declarations/cashier_backend/cashier_backend.did";
import { getIdentity } from "../utils/wallet";
import { ActorSubclass } from "@dfinity/agent";
import { parseResultResponse } from "../utils/parser";
import { ActorManager } from "../utils/service";
import { sleep } from "../utils/sleep";

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

    let servicerHelper: ActorManager;

    let linkId: string;
    let userId: string;
    let createLinkIntentId: string;

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
        servicerHelper = new ActorManager({
            canisterId: "jjio5-5aaaa-aaaam-adhaq-cai",
            identity: identity1,
        });

        actor = await servicerHelper.initBackendActor();

        const user = await actor.get_user();

        if ("Err" in user) {
            const createdUser = await actor.create_user();
            const res = parseResultResponse(createdUser);
            userId = res.id;
        } else {
            userId = user.Ok.id;
        }
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
        expect(res.link.state).toEqual(["Link_state_choose_link_type"]);
    });

    it("should transition from choose tempalte to add asset success", async () => {
        const linkInput: UpdateLinkInput = {
            id: linkId,
            action: "Continue",
            params: [
                {
                    Update: {
                        params: [
                            {
                                title: [testPayload.title],
                                asset_info: [],
                                description: [],
                                template: [],
                                link_image_url: [],
                                nft_image: [],
                                link_type: [testPayload.link_type],
                            },
                        ],
                    },
                },
            ],
        };

        const updateLinkRes = await actor.update_link(linkInput);
        const linkUpdated = parseResultResponse(updateLinkRes);

        expect(linkUpdated.id).toEqual(linkId);
        expect(linkUpdated.title).toEqual([testPayload.title]);
        expect(linkUpdated.link_type).toEqual([testPayload.link_type]);
        expect(linkUpdated.state).toEqual(["Link_state_add_assets"]);
    });

    it("should transition from add asset to create link", async () => {
        const linkInput: UpdateLinkInput = {
            id: linkId,
            action: "Continue",
            params: [
                {
                    Update: {
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
                    },
                },
            ],
        };

        const updateLinkRes = await actor.update_link(linkInput);
        const linkUpdated = parseResultResponse(updateLinkRes);

        expect(linkUpdated.id).toEqual(linkId);
        expect(linkUpdated.asset_info).toHaveLength(1);
        expect(linkUpdated.state).toEqual(["Link_state_create_link"]);
    });

    it("should create itent success", async () => {
        const input: CreateIntentInput = {
            link_id: linkId,
            intent_type: "Create",
            params: [],
        };

        const createIntentRes = await actor.create_intent(input);
        const res = parseResultResponse(createIntentRes);
        createLinkIntentId = res.intent.id;

        expect(res.consents.fee).toHaveLength(1);
        expect(res.consents.send).toHaveLength(1);
        expect(res.consents.receive).toHaveLength(1);
        expect(res.intent.creator_id).toEqual(userId);
        expect(res.intent.link_id).toEqual(linkId);
        expect(res.intent.intent_type).toEqual("Create");
        expect(res.intent.state).toEqual("Intent_state_created");
    });
    it("should get consent message success", async () => {
        const input: GetConsentMessageInput = {
            link_id: linkId,
            intent_type: "Create",
            params: [],
            intent_id: createLinkIntentId,
        };

        const createIntentRes = await actor.get_consent_message(input);
        const res = parseResultResponse(createIntentRes);

        expect(res.fee).toHaveLength(1);
        expect(res.send).toHaveLength(1);
        expect(res.receive).toHaveLength(1);
    });

    it("should confirm the intent and validate based on the intent", async () => {
        const input: ConfirmIntentInput = {
            link_id: linkId,
            intent_id: createLinkIntentId,
        };

        const createLinkRes = await actor.confirm_intent(input);
        const res = parseResultResponse(createLinkRes);
        const getLinkRes = await actor.get_link(linkId, [
            {
                intent_type: "Create",
            },
        ]);
        const link = parseResultResponse(getLinkRes);

        // Ensure the intent array has length greater than or equal to 1
        expect(link.intent.length).toBeGreaterThanOrEqual(1);

        if (link.intent.length === 0) {
            return;
        }

        // Get the first intent
        const intent = link.intent[0];

        // Perform validation based on the intent
        expect(intent.state).toEqual("Intent_state_processing");

        // Check the state of all transactions
        const allTransactions = intent.transactions.flat();
        allTransactions.forEach((transaction) => {
            expect(transaction.state).toEqual("Transaction_state_processing");
        });
        // Assert
        expect(res).not.toBeNull();
        expect(link.intent).toHaveLength(1);
        expect(intent.transactions).toHaveLength(2);
    });

    it("Should set transaction to timeout", async () => {
        // Sleep for 20 seconds to wait for the update
        await sleep(15_000);

        // Get the link after waiting
        const getLinkRes = await actor.get_link(linkId, [
            {
                intent_type: "Create",
            },
        ]);
        const link = parseResultResponse(getLinkRes);

        // Ensure the intent array has length greater than or equal to 1
        expect(link.intent.length).toBeGreaterThanOrEqual(1);

        if (link.intent.length === 0) {
            return;
        }

        // Perform assertions
        const intent = link.intent[0];
        console.log("intent state", intent.state);
        expect(intent.state).toEqual("Intent_state_fail");
        const allTransactions = intent.transactions.flat();
        allTransactions.forEach((transaction) => {
            expect(transaction.state).toEqual("Transaction_state_timeout");
        });
    });
});
