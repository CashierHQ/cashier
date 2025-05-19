/* eslint-disable @typescript-eslint/no-explicit-any */
import { LinkTestFixture, LinkConfig, AssetInfo } from "../../fixtures/link-test-fixture";
import { IntentDto } from "../../../declarations/cashier_backend/cashier_backend.did";
import { fromNullable } from "@dfinity/utils";
import { FEE_CANISTER_ID } from "../../constant";

describe("Test double claim for tip link", () => {
    const fixture = new LinkTestFixture();
    let linkId: string;
    // Common test configuration
    const testConfig: LinkConfig = {
        title: "tip 20 icp",
        description: "tip 20 icp to the user",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "SendTip",
        link_use_action_max_count: BigInt(1),
    };

    const assetInfo: AssetInfo = {
        chain: "IC",
        address: FEE_CANISTER_ID,
        label: "SEND_TIP_ASSET",
        amount_per_claim: BigInt(10_0000_0000),
    };

    beforeAll(async () => {
        await fixture.setup({
            airdropAmount: BigInt(1_0000_0000_0000),
        });
    });

    afterAll(async () => {
        await fixture.tearDown();
    });

    describe("With Alice", () => {
        beforeEach(async () => {
            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000); // 1 minute
        });

        it("should complete the full link creation process", async () => {
            // Create and set up the link using the fixture's helper method
            const result = await fixture.setupPreconfiguredTipLinkWithClaim(
                testConfig,
                [assetInfo],
                BigInt(1),
            );

            linkId = result.linkId;

            // Verify link is active
            const linkState = await fixture.getLinkWithActions(linkId, "CreateLink");
            expect(linkState.link.state).toEqual("Link_state_active");

            const linkBalance = await fixture.checkLinkBalance(assetInfo.address, linkId);
            // because the link already has a claim action, the balance should be 0
            expect(linkBalance).toEqual(0n);

            // Verify action successful
            const actions = fromNullable(linkState.action);
            expect(actions).toBeDefined();
            expect(actions!.state).toEqual("Action_state_success");
            actions!.intents.forEach((intent: IntentDto) => {
                expect(intent.state).toEqual("Intent_state_success");
            });
        });
    });

    describe("With Bob", () => {
        beforeEach(async () => {
            fixture.switchToUser("bob");
            await fixture.advanceTime(1 * 60 * 1000); // 1 minute
        });

        it("shouold get error if try to claim tip link again", async () => {
            const result = fixture.createAction(linkId, "Use");

            await expect(result).rejects.toThrow(
                '{"ValidationErrors":"Action is already success"}',
            );

            // Verify link state
            const linkState = await fixture.getLinkWithActions(linkId);
            expect(linkState.link.link_use_action_counter).toEqual(1n);
        });
    });
});
