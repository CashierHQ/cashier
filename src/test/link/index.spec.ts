// Import generated types for your canister
import { User, type _SERVICE } from "../../declarations/cashier_backend/cashier_backend.did";
import { getRandomIdentity } from "../utils/wallet";
import { ActorSubclass } from "@dfinity/agent";

describe("Link", () => {
    let actor: ActorSubclass<_SERVICE>;

    // const identity = getRandomIdentity();
    // let user: User | undefined = undefined;

    it("should return error if user didn't exist", async () => {
        // Arrange
        const user_id = "user_id";

        // Act
        const result = await actor.create_link({
            link_type: {
                TipLink: null,
            },
        });

        // Assert
        expect(result).toEqual({ Ok: user_id });
    });
});
