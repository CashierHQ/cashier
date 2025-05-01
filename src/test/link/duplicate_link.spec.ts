/* eslint-disable @typescript-eslint/no-explicit-any */
import { LinkTestFixture, LinkConfig, AssetInfo } from "../fixtures/link-test-fixture";

describe("Test create and claim tip link", () => {
    const fixture = new LinkTestFixture();

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
        address: "x5qut-viaaa-aaaar-qajda-cai",
        label: "SEND_TIP_ASSET",
        amount_per_claim: BigInt(10_0000_0000),
    };

    beforeAll(async () => {
        await fixture.setup({
            airdropAmount: BigInt(1_0000_0000_0000),
            advanceTimeAfterSetup: 30 * 1000,
        });
    });

    afterAll(async () => {
        await fixture.tearDown();
    });

    describe("With Alice", () => {
        beforeEach(async () => {
            fixture.switchToUser("alice");
        });

        it("should complete the full link creation process", async () => {
            // Create and set up the link using the fixture's helper method
            const linkId = await fixture.completeCreateLinkFlow(
                "SendTip",
                testConfig,
                [assetInfo],
                BigInt(1),
            );

            const [action1, action2, action3, action4] = await Promise.all([
                fixture.createActionForLink(linkId, "CreateLink"),
                fixture.createActionForLink(linkId, "CreateLink"),
                fixture.createActionForLink(linkId, "CreateLink"),
                fixture.createActionForLink(linkId, "CreateLink"),
            ]);

            // Verify all actions have the same ID
            expect(action1.actionId).toEqual(action2.actionId);
            expect(action2.actionId).toEqual(action3.actionId);
            expect(action3.actionId).toEqual(action4.actionId);
            expect(action1.actionId).toEqual(action4.actionId);

            // Verify all actions are for the same link
            expect(action1.linkId).toEqual(action2.linkId);
            expect(action2.linkId).toEqual(action3.linkId);
            expect(action3.linkId).toEqual(action4.linkId);
            expect(action1.linkId).toEqual(linkId);
        });
    });
});
