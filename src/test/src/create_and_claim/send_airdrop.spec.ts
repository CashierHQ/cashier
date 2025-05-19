// Cashier — No-code blockchain transaction builder
// Copyright (C) 2025 TheCashierApp LLC
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { LinkTestFixture, LinkConfig, AssetInfo } from "../../fixtures/link-test-fixture";
import { IntentDto } from "../../../declarations/cashier_backend/cashier_backend.did";
import { fromNullable } from "@dfinity/utils";
import { FEE_CANISTER_ID } from "../../constant";

describe("Test create and claim token airdrop link", () => {
    const fixture = new LinkTestFixture();
    let linkId: string;
    let claimActionId: string;

    // Common test configuration
    const testConfig: LinkConfig = {
        title: "tip 20 icp",
        description: "tip 20 icp to the user",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "SendAirdrop",
        link_use_action_max_count: BigInt(5),
    };

    const assetInfo: AssetInfo = {
        chain: "IC",
        address: FEE_CANISTER_ID,
        label: "SEND_AIRDROP_ASSET",
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
        });

        it("should complete the full link creation process", async () => {
            // Create and set up the link using the fixture's helper method
            const result = await fixture.completeActiveLinkFlow(
                "SendAirdrop",
                testConfig,
                [assetInfo],
                BigInt(5),
                {
                    icrc1TransferAmount: BigInt(50_0000_0000),
                },
            );

            linkId = result.linkId;

            // Verify link is active
            const linkState = await fixture.getLinkWithActions(linkId, "CreateLink");
            expect(linkState.link.state).toEqual("Link_state_active");
            expect(linkState.link.link_use_action_counter).toEqual(0n);
            expect(linkState.link.link_use_action_max_count).toEqual(BigInt(5));

            const linkBalance = await fixture.checkLinkBalance(assetInfo.address, linkId);
            expect(linkBalance).toEqual(
                assetInfo.amount_per_claim! * linkState.link.link_use_action_max_count,
            );

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
        beforeAll(async () => {
            fixture.switchToUser("bob");
        });

        it("should retrieve empty user state initially", async () => {
            const userState = await fixture.getUserState(linkId, "Use");
            expect(userState).toEqual(undefined);
        });

        it("should create use action", async () => {
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
            // Get initial balance
            const bobAccount = {
                owner: fixture.identities.bob.getPrincipal(),
                subaccount: [] as any,
            };

            const balanceBefore = await fixture.tokenHelper!.balanceOf(bobAccount);

            // Check link balance before claim
            const linkBalanceBefore = await fixture.checkLinkBalance(assetInfo.address, linkId);
            expect(linkBalanceBefore).toEqual(assetInfo.amount_per_claim! * BigInt(5));

            // Process claim action
            const result = await fixture.confirmAction(linkId, claimActionId, "Use");
            expect(result.state).toEqual("Action_state_success");
            expect(result.intents[0].state).toEqual("Intent_state_success");

            // Verify balance after claim
            const balanceAfter = await fixture.tokenHelper!.balanceOf(bobAccount);
            const balanceChanged = balanceAfter - balanceBefore;
            expect(balanceChanged).toEqual(assetInfo.amount_per_claim! - BigInt(10_000)); // Minus fee

            // Check link balance after claim
            const linkBalanceAfter = await fixture.checkLinkBalance(assetInfo.address, linkId);
            expect(linkBalanceAfter).toEqual(assetInfo.amount_per_claim! * BigInt(4)); // Reduced by one claim

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
                "SendAirdrop",
                testConfig,
                [assetInfo],
                BigInt(5),
                {
                    icrc1TransferAmount: BigInt(50_0000_0000),
                },
            );

            linkClaimAnymousId = result.linkId;
        });

        it("should allow anonymous user to claim", async () => {
            // Create a new link for anonymous testing
            fixture.switchToAnonymous();

            const walletAddress = fixture.identities.bob.getPrincipal().toText();

            // Get initial balance for Bob's account
            const bobAccount = {
                owner: fixture.identities.bob.getPrincipal(),
                subaccount: [] as any,
            };
            const balanceBefore = await fixture.tokenHelper!.balanceOf(bobAccount);

            // Check link balance before claim
            const linkBalanceBefore = await fixture.checkLinkBalance(
                assetInfo.address,
                linkClaimAnymousId,
            );

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

            // Verify balance after claim
            const balanceAfter = await fixture.tokenHelper!.balanceOf(bobAccount);
            const balanceChanged = balanceAfter - balanceBefore;
            expect(balanceChanged).toEqual(assetInfo.amount_per_claim! - BigInt(10_000)); // Minus fee

            // Check link balance after claim
            const linkBalanceAfter = await fixture.checkLinkBalance(
                assetInfo.address,
                linkClaimAnymousId,
            );
            expect(linkBalanceAfter).toEqual(linkBalanceBefore - assetInfo.amount_per_claim!);

            // Verify link state
            const linkState = await fixture.getLinkWithActions(linkClaimAnymousId);
            expect(linkState.link.link_use_action_counter).toEqual(1n);

            // Update user state to completed
            fixture.updateUserState(linkClaimAnymousId, "Use", "Continue", walletAddress);
        });
    });
});
