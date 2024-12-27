// Import generated types for your canister
import { PocketIc, type Actor } from "@hadronous/pic";
import { type _SERVICE, idlFactory } from "../../declarations/cashier_backend/cashier_backend.did";
import { resolve } from "path";
import { getIdentity } from "../utils/wallet";
import { parseResultResponse } from "../utils/parser";

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
    let pic: PocketIc;
    // let canisterId: Principal;
    let actor: Actor<_SERVICE>;

    const identity = getIdentity("user1");

    // The `beforeEach` hook runs before each test.
    //
    // This can be replaced with a `beforeAll` hook to persist canister
    // state between tests.
    beforeEach(async () => {
        // create a new PocketIC instance
        pic = await PocketIc.create(process.env.PIC_URL);

        // Setup the canister and actor
        const fixture = await pic.setupCanister<_SERVICE>({
            idlFactory,
            wasm: WASM_PATH,
        });

        // Save the actor and canister ID for use in tests
        actor = fixture.actor;
        // canisterId = fixture.canisterId;

        actor.setIdentity(identity);
    });

    // The `afterEach` hook runs after each test.
    //
    // This should be replaced with an `afterAll` hook if you use
    // a `beforeAll` hook instead of a `beforeEach` hook.
    afterEach(async () => {
        // tear down the PocketIC instance
        await pic.tearDown();
    });

    // The `it` function is used to define individual tests
    it("should return error if user didn't exist", async () => {
        // Arrange

        // Act
        const user = await actor.get_user();

        // Assert
        expect(user).toEqual({ Err: "User not found" });
    });

    // it("should create new user successfully", async () => {
    //     // Arrange

    //     // Act
    //     const result = await actor.create_user();
    //     const user = parseResultResponse(result);

    //     // Assert
    //     expect(result).toHaveProperty("Ok");
    //     expect(result).not.toHaveProperty("Err");

    //     expect(user).toHaveProperty("wallet");
    //     expect(user).toBe(identity.getPrincipal().toText());
    // });
});
