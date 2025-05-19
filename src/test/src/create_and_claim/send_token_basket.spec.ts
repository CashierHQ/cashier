/* eslint-disable @typescript-eslint/no-explicit-any */
import { LinkTestFixture, LinkConfig, AssetInfo } from "../../fixtures/link-test-fixture";
import { IntentDto } from "../../../declarations/cashier_backend/cashier_backend.did";
import { fromNullable } from "@dfinity/utils";

describe("Test create and claim token basket link", () => {
    const fixture = new LinkTestFixture();
    let linkId: string;
    let claimActionId: string;

    // Common test configuration
    const testConfig: LinkConfig = {
        title: "tip 20 icp",
        description: "tip 20 icp to the user",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "SendTokenBasket",
        link_use_action_max_count: BigInt(1),
    };

    beforeAll(async () => {
        await fixture.setup({
            airdropAmount: BigInt(1_0000_0000_0000),
            useMultipleTokens: true,
        });
    });

    afterAll(async () => {
        await fixture.tearDown();
    });

    let assets: (AssetInfo & {
        tokenIndex: string;
    })[] = [];

    beforeAll(async () => {
        const multiple_token_helper = fixture.multiTokenHelper!;
        assets = [
            {
                chain: "IC",
                address: multiple_token_helper.getTokenCanisterId("token1").toString(),
                label:
                    "SEND_TOKEN_BASKET_ASSET" +
                    "_" +
                    multiple_token_helper.getTokenCanisterId("token1").toString(),
                amount_per_claim: BigInt(10_0000_0000),
                amount_per_link_use_action: BigInt(10_0000_0000),
                tokenIndex: "token1",
            },
            {
                chain: "IC",
                address: multiple_token_helper.getTokenCanisterId("token2").toString(),
                label:
                    "SEND_TOKEN_BASKET_ASSET" +
                    "_" +
                    multiple_token_helper.getTokenCanisterId("token2").toString(),
                amount_per_claim: BigInt(20_0000_0000),
                amount_per_link_use_action: BigInt(20_0000_0000),
                tokenIndex: "token2",
            },
            {
                chain: "IC",
                address: multiple_token_helper.getTokenCanisterId("token3").toString(),
                label:
                    "SEND_TOKEN_BASKET_ASSET" +
                    "_" +
                    multiple_token_helper.getTokenCanisterId("token3").toString(),
                amount_per_claim: BigInt(30_0000_0000),
                amount_per_link_use_action: BigInt(30_0000_0000),
                tokenIndex: "token3",
            },
        ];
    });

    describe("With Alice", () => {
        beforeEach(async () => {
            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000); // 1 minute
        });

        it("should complete the full link creation process", async () => {
            // Create and set up the link using the fixture's helper method
            const result = await fixture.completeActiveLinkFlow(
                "SendTokenBasket",
                testConfig,
                assets,
                BigInt(1),
            );

            linkId = result.linkId;

            // Verify link is active
            const linkState = await fixture.getLinkWithActions(linkId, "CreateLink");
            expect(linkState.link.state).toEqual("Link_state_active");

            for (const asset of assets) {
                const linkBalance = await fixture.checkLinkBalance(asset.address, linkId);
                expect(linkBalance).toEqual(asset.amount_per_claim!);
            }

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
            const userState = await fixture.getUserState(linkId, "Use");
            expect(userState).toEqual(undefined);
        });

        it("should create claim action", async () => {
            claimActionId = await fixture.createAction(linkId, "Use");
            expect(claimActionId).toBeTruthy();

            // Verify user state after creating claim
            const userState = await fixture.getUserState(linkId, "Use");
            if (!userState) {
                throw new Error("User state is undefined");
            }
            expect(userState.link_user_state).toEqual("User_state_choose_wallet");
            expect(userState.action.state).toEqual("Action_state_created");
        });

        it("should process claim successfully", async () => {
            // Get initial balance for each token
            const bobAccount = {
                owner: fixture.identities.bob.getPrincipal(),
                subaccount: [] as any,
            };

            const balanceBeforeMap = new Map<string, bigint>();

            // Store initial balances for all tokens in the basket
            for (const asset of assets) {
                const balanceBefore = await fixture.multiTokenHelper!.balanceOf(
                    asset.tokenIndex,
                    bobAccount,
                );
                balanceBeforeMap.set(asset.tokenIndex, balanceBefore);
            }

            // Process claim action
            const result = await fixture.confirmAction(linkId, claimActionId, "Use");
            expect(result.state).toEqual("Action_state_success");
            expect(result.intents[0].state).toEqual("Intent_state_success");

            // Verify balance after claim for each token
            for (const asset of assets) {
                const balanceBefore = balanceBeforeMap.get(asset.tokenIndex) || BigInt(0);
                const balanceAfter = await fixture.multiTokenHelper!.balanceOf(
                    asset.tokenIndex,
                    bobAccount,
                );
                const balanceChanged = balanceAfter - balanceBefore;

                // Each token should increase by amount_per_claim minus the fee
                expect(balanceChanged).toEqual(asset.amount_per_claim! - BigInt(10_000)); // Minus fee
            }

            // Verify link state
            const linkState = await fixture.getLinkWithActions(linkId);
            expect(linkState.link.link_use_action_counter).toEqual(1n);
        });

        it("should complete the claim process", async () => {
            const result = await fixture.updateUserState(linkId, "Use", "Continue");

            expect(result[0].link_user_state).toEqual("User_state_completed_link");
            expect(result[0].action.state).toEqual("Action_state_success");
            expect(result[0].action.type).toEqual("Use");
        });
    });

    describe("Anonymous User Flow", () => {
        let linkClaimAnymousId: string;

        beforeAll(async () => {
            fixture.switchToUser("alice");

            const result = await fixture.completeActiveLinkFlow(
                "SendTokenBasket",
                testConfig,
                assets,
                BigInt(1),
            );

            console.log("Link created for anonymous testing:", result);

            linkClaimAnymousId = result.linkId;
        });

        it("should allow anonymous user to claim", async () => {
            // Create a new link for anonymous testing
            fixture.switchToAnonymous();

            const walletAddress = fixture.identities.bob.getPrincipal().toText();

            // Get Bob's initial balance for each token before anonymous claim
            const bobAccount = {
                owner: fixture.identities.bob.getPrincipal(),
                subaccount: [] as any,
            };

            const balanceBeforeMap = new Map<string, bigint>();
            for (const asset of assets) {
                const balanceBefore = await fixture.multiTokenHelper!.balanceOf(
                    asset.tokenIndex,
                    bobAccount,
                );
                balanceBeforeMap.set(asset.tokenIndex, balanceBefore);
            }

            // Process anonymous claim
            const claimResult = await fixture.processActionAnonymous(
                linkClaimAnymousId,
                "",
                "Use",
                walletAddress,
            );

            expect(claimResult).toBeTruthy();
            expect(claimResult.type).toEqual("Use");

            // Complete anonymous claim
            const confirmResult = await fixture.processActionAnonymous(
                linkClaimAnymousId,
                claimResult.id,
                "Use",
                walletAddress,
            );

            expect(confirmResult.state).toEqual("Action_state_success");

            // Verify balance changes for each token
            for (const asset of assets) {
                const balanceBefore = balanceBeforeMap.get(asset.tokenIndex) || BigInt(0);
                const balanceAfter = await fixture.multiTokenHelper!.balanceOf(
                    asset.tokenIndex,
                    bobAccount,
                );
                const balanceChanged = balanceAfter - balanceBefore;

                // Each token should increase by amount_per_claim minus the fee
                expect(balanceChanged).toEqual(asset.amount_per_claim! - BigInt(10_000)); // Minus fee
            }

            // Update user state to completed
            fixture.updateUserState(linkClaimAnymousId, "Use", "Continue", walletAddress);
        });
    });
});
