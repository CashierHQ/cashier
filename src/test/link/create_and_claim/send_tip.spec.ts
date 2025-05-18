/* eslint-disable @typescript-eslint/no-explicit-any */
import { LinkTestFixture, LinkConfig, AssetInfo } from "../../fixtures/link-test-fixture";
import { ActionDto, IntentDto } from "../../../declarations/cashier_backend/cashier_backend.did";
import { fromNullable } from "@dfinity/utils";
import { FEE_CANISTER_ID } from "../../constant";

describe("Test create and claim tip link", () => {
    const fixture = new LinkTestFixture();
    let linkId: string;
    let claimActionId: string;

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
            const result = await fixture.completeActiveLinkFlow(
                "SendTip",
                testConfig,
                [assetInfo],
                BigInt(1),
            );

            linkId = result.linkId;

            // Verify link is active
            const linkState = await fixture.getLinkWithActions(linkId, "CreateLink");
            expect(linkState.link.state).toEqual("Link_state_active");

            const linkBalance = await fixture.checkLinkBalance(assetInfo.address, linkId);
            expect(linkBalance).toEqual(assetInfo.amount_per_claim!);

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

        it("should retrieve empty user state initially", async () => {
            const userState = await fixture.getUserState(linkId, "Claim");
            expect(userState).toEqual(undefined);
        });

        it("should create claim action", async () => {
            claimActionId = await fixture.createAction(linkId, "Claim");
            expect(claimActionId).toBeTruthy();

            // Verify user state after creating claim
            const userState = await fixture.getUserState(linkId, "Claim");
            expect(userState).toBeTruthy();

            if (!userState) {
                throw new Error("User state is empty");
            }

            expect(userState.link_user_state).toEqual("User_state_choose_wallet");
            expect(userState.action.state).toEqual("Action_state_created");
        });

        it("should process claim successfully", async () => {
            // Get initial balance
            const bobAccount = {
                owner: fixture.identities.bob.getPrincipal(),
                subaccount: [] as any,
            };

            const balanceBefore = await fixture.tokenHelper!.balanceOf(bobAccount);

            const userState = await fixture.getUserState(linkId, "Claim");
            console.log("User state before claim:", userState);
            if (!userState) {
                throw new Error("User state is empty");
            }

            expect(userState.link_user_state).toEqual("User_state_choose_wallet");
            expect(userState.action.state).toEqual("Action_state_created");

            let result: ActionDto | undefined;
            try {
                result = await fixture.confirmAction(linkId, claimActionId, "Claim");
            } catch (e) {
                console.error("Error during claim action:", e);
            }
            console.log("Claim result:", result);
            if (!result) {
                throw new Error("Claim result is empty");
            }
            expect(result.state).toEqual("Action_state_success");
            expect(result.intents[0].state).toEqual("Intent_state_success");

            // Verify balance after claim
            const balanceAfter = await fixture.tokenHelper!.balanceOf(bobAccount);
            const balanceChanged = balanceAfter - balanceBefore;
            expect(balanceChanged).toEqual(assetInfo.amount_per_claim! - BigInt(10_000)); // Minus fee

            // Verify link state
            const linkState = await fixture.getLinkWithActions(linkId);
            expect(linkState.link.link_use_action_counter).toEqual(1n);
        });

        it("should complete the claim process", async () => {
            const result = await fixture.updateUserState(linkId, "Claim", "Continue");

            expect(result[0].link_user_state).toEqual("User_state_completed_link");
            expect(result[0].action.state).toEqual("Action_state_success");
            expect(result[0].action.type).toEqual("Claim");
        });
    });

    describe("Anonymous User Flow", () => {
        let linkClaimAnymousId: string;

        beforeAll(async () => {
            fixture.switchToUser("alice");

            const result = await fixture.completeActiveLinkFlow(
                "SendTip",
                testConfig,
                [assetInfo],
                BigInt(1),
            );

            console.log("Link created for anonymous testing:", result);

            linkClaimAnymousId = result.linkId;
        });
        it("should allow anonymous user to claim", async () => {
            // Create a new link for anonymous testing
            fixture.switchToAnonymous();

            const walletAddress = fixture.identities.bob.getPrincipal().toText();

            // Process anonymous claim
            const claimResult = await fixture.processActionAnonymous(
                linkClaimAnymousId,
                "",
                "Claim",
                walletAddress,
            );

            expect(claimResult).toBeTruthy();
            expect(claimResult.type).toEqual("Claim");

            // Complete anonymous claim
            const confirmResult = await fixture.processActionAnonymous(
                linkClaimAnymousId,
                claimResult.id,
                "Claim",
                walletAddress,
            );

            expect(confirmResult.state).toEqual("Action_state_success");

            // Update user state to completed
            fixture.updateUserState(linkClaimAnymousId, "Claim", "Continue", walletAddress);
        });
    });
});
