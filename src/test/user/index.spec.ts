// Import generated types for your canister
import {
    CreateLinkInput,
    type _SERVICE,
} from "../../declarations/cashier_backend/cashier_backend.did";
import { resolve } from "path";
import { getRandomIdentity } from "../utils/wallet";
import { parseResultResponse } from "../utils/parser";
import { initLocalAgent } from "../utils/agent";
import { ActorSubclass } from "@dfinity/agent";

// Define the path to your canister's WASM file
export const WASM_PATH = resolve(
    "target",
    "wasm32-unknown-unknown",
    "release",
    "cashier_backend.wasm",
);

// The `describe` function is used to group tests together
// and is completely optional.
describe("User", () => {
    // Define variables to hold our PocketIC instance, canister ID,
    // and an actor to interact with our canister.
    // let pic: PocketIc;
    // let canisterId: Principal;
    let actor: ActorSubclass<_SERVICE>;

    const identity = getRandomIdentity();

    // The `beforeEach` hook runs before each test.
    //
    // This can be replaced with a `beforeAll` hook to persist canister
    // state between tests.
    beforeEach(async () => {
        // create a new PocketIC instance
        // pic = await PocketIc.create(process.env.PIC_URL);

        // // Setup the canister and actor
        // const fixture = await pic.setupCanister<_SERVICE>({
        //     idlFactory,
        //     wasm: WASM_PATH,
        // });

        // Save the actor and canister ID for use in tests
        actor = initLocalAgent("jjio5-5aaaa-aaaam-adhaq-cai", identity);
    });

    // The `afterEach` hook runs after each test.
    //
    // This should be replaced with an `afterAll` hook if you use
    // a `beforeAll` hook instead of a `beforeEach` hook.
    // afterEach(async () => {
    //     // tear down the PocketIC instance
    //     await pic.tearDown();
    // });

    // The `it` function is used to define individual tests
    it("should return error if user didn't exist", async () => {
        // Arrange

        // Act
        const user = await actor.get_user();

        // Assert
        expect(user).toEqual({ Err: "User not found" });
    });

    it("should create new user successfully", async () => {
        // Act
        const result = await actor.create_user();
        const user = parseResultResponse(result);

        // Assert
        expect(result).toHaveProperty("Ok");
        expect(result).not.toHaveProperty("Err");

        expect(user).toHaveProperty("wallet");
        expect(user.wallet).toBe(identity.getPrincipal().toText());
    });

    it("should create link success", async () => {
        const input: CreateLinkInput = {
            link_type: {
                TipLink: null,
            },
        };

        const createLinkRes = await actor.create_link(input);

        // Assert
        expect(createLinkRes).toHaveProperty("Ok");
    });
});
