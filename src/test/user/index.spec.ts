// Import generated types for your canister
import {
    // CreateLinkInput,
    type _SERVICE,
    idlFactory,
} from "../../declarations/cashier_backend/cashier_backend.did";
import { resolve } from "path";
import { Actor, createIdentity, PocketIc } from "@dfinity/pic";
import { parseResultResponse } from "../utils/parser";

export const WASM_PATH = resolve("artifacts", "cashier_backend.wasm.gz");

describe("User", () => {
    let pic: PocketIc;
    let actor: Actor<_SERVICE>;

    const alice = createIdentity("superSecretAlicePassword");

    beforeAll(async () => {
        pic = await PocketIc.create(process.env.PIC_URL);
        const currentTime = new Date(1734434601000);
        await pic.setTime(currentTime.getTime());

        await pic.tick(1);

        // Setup the canister and actor
        const fixture = await pic.setupCanister<_SERVICE>({
            idlFactory,
            wasm: WASM_PATH,
        });

        actor = fixture.actor;
    });

    afterAll(async () => {
        await pic.tearDown();
    });

    beforeEach(async () => {
        await pic.advanceTime(5 * 60 * 1000);
        await pic.tick(50);
    });

    describe("With Alice", () => {
        beforeEach(() => {
            actor.setIdentity(alice);
        });
        it("should return error if user didn't exist", async () => {
            const user = await actor.get_user();

            expect(user).toEqual({ Err: "User not found" });
        });

        it("should create new user successfully", async () => {
            const result = await actor.create_user();
            const user = parseResultResponse(result);

            expect(result).toHaveProperty("Ok");
            expect(result).not.toHaveProperty("Err");

            expect(user).toHaveProperty("wallet");
            expect(user.wallet).toBe(alice.getPrincipal().toText());
        });
    });
});
