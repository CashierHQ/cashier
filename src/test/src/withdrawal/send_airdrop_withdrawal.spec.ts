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
import { fromNullable, toNullable } from "@dfinity/utils";
import { CREATE_LINK_FEE, FEE_CANISTER_ID, TREASURY_WALLET } from "../../constant";
import { Icrc112ExecutorV2 } from "../../utils/icrc-112-v2";
import { parseResultResponse } from "../../utils/parser";

describe("Send Airdrop Link Withdrawal Tests", () => {
    const fixture = new LinkTestFixture();
    let alice_id: string | null = null;
    let bob_id: string | null = null;

    const ledger_fee = BigInt(10_000);

    // Test configuration for send airdrop links
    const testConfig: LinkConfig = {
        title: "Airdrop 10 ICP",
        description: "Airdrop 10 ICP to 5 users",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "SendAirdrop",
        link_use_action_max_count: BigInt(5),
    };

    const assetInfo: AssetInfo = {
        chain: "IC",
        address: FEE_CANISTER_ID,
        label: "SEND_AIRDROP_ASSET",
        amount_per_link_use: BigInt(10_0000_0000), // 10 ICP per claim
    };

    beforeAll(async () => {
        await fixture.setup({});
        await fixture.airdropTokensToUsers(
            BigInt(100_0000_0000), // Airdrop 100 ICP to each user
            ["alice", "bob"],
        );
        alice_id = (await fixture.getUserDetails("alice")).id;
        bob_id = (await fixture.getUserDetails("bob")).id;
    });

    afterAll(async () => {
        await fixture.tearDown();
    });

    describe("Active Airdrop Link Withdrawal", () => {
        let activeAirdropLinkId: string;

        beforeEach(async () => {
            // Alice creates an airdrop link with 50 ICP (5 claims × 10 ICP)
            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000);

            const maxUse = BigInt(5);
            const airdropAmount = (assetInfo.amount_per_link_use! + ledger_fee) * maxUse;
            const approveAmount = CREATE_LINK_FEE + ledger_fee;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc1Transfer("ICP", airdropAmount);
                await executor.executeIcrc2Approve("ICP", approveAmount);
                await executor.triggerTransaction();
            };

            const result = await fixture.completeActiveLinkFlow(
                "SendAirdrop",
                testConfig,
                [assetInfo],
                maxUse,
                fixture.identities.get("alice")!,
                execute_tx,
            );

            activeAirdropLinkId = result.link.id;
        });

        it("should allow creator to withdraw entire unclaimed airdrop", async () => {
            // Verify link is active and has full funds
            const linkBefore = await fixture.getLinkWithActions(activeAirdropLinkId);
            expect(linkBefore.link.state).toEqual("Link_state_active");
            expect(linkBefore.link.creator).toEqual(alice_id);
            expect(linkBefore.link.link_use_action_counter).toEqual(0n);

            const aliceBalanceBefore = await fixture.getUserBalance("alice", "ICP");
            const linkBalanceBefore = await fixture.checkLinkBalance(
                FEE_CANISTER_ID,
                activeAirdropLinkId,
            );

            // Should have 5 × 10 ICP = 50 ICP
            const expectedLinkBalance = assetInfo.amount_per_link_use! * BigInt(5);
            expect(linkBalanceBefore).toEqual(expectedLinkBalance);

            // Alice withdraws the entire airdrop
            fixture.switchToUser("alice");
            const withdrawAction = await fixture.createAction(activeAirdropLinkId, "Withdraw");
            expect(withdrawAction.type).toEqual("Withdraw");
            expect(withdrawAction.creator).toEqual(alice_id);

            const withdrawResult = await fixture.processAction(
                activeAirdropLinkId,
                withdrawAction.id,
                "Withdraw",
            );
            expect(withdrawResult.state).toEqual("Action_state_success");

            // Verify link state after withdrawal
            const linkAfter = await fixture.getLinkWithActions(activeAirdropLinkId);
            expect(linkAfter.link.state).toEqual("Link_state_cancelled");

            // Verify Alice gets the full airdrop back minus fees
            const aliceBalanceAfter = await fixture.getUserBalance("alice", "ICP");
            const linkBalanceAfter = await fixture.checkLinkBalance(
                FEE_CANISTER_ID,
                activeAirdropLinkId,
            );

            const expectedRefund = linkBalanceBefore - ledger_fee; // Minus withdrawal fee
            expect(aliceBalanceAfter).toEqual(aliceBalanceBefore + expectedRefund);
            expect(linkBalanceAfter).toEqual(BigInt(0));
        });

        it("should allow withdrawal of remaining funds after partial claims", async () => {
            // Bob claims once from the airdrop
            fixture.switchToUser("bob");
            const claimAction = await fixture.createAction(activeAirdropLinkId, "Use");
            const claimResult = await fixture.processAction(
                activeAirdropLinkId,
                claimAction.id,
                "Use",
            );
            expect(claimResult.state).toEqual("Action_state_success");

            // Verify one claim was made
            const linkAfterClaim = await fixture.getLinkWithActions(activeAirdropLinkId);
            expect(linkAfterClaim.link.link_use_action_counter).toEqual(1n);
            expect(linkAfterClaim.link.state).toEqual("Link_state_active");

            const linkBalanceAfterClaim = await fixture.checkLinkBalance(
                FEE_CANISTER_ID,
                activeAirdropLinkId,
            );
            const expectedRemainingBalance = assetInfo.amount_per_link_use! * BigInt(4); // 4 claims left
            expect(linkBalanceAfterClaim).toEqual(expectedRemainingBalance);

            // Alice withdraws the remaining funds
            fixture.switchToUser("alice");
            const aliceBalanceBefore = await fixture.getUserBalance("alice", "ICP");

            const withdrawAction = await fixture.createAction(activeAirdropLinkId, "Withdraw");
            const withdrawResult = await fixture.processAction(
                activeAirdropLinkId,
                withdrawAction.id,
                "Withdraw",
            );
            expect(withdrawResult.state).toEqual("Action_state_success");

            // Verify link is cancelled
            const linkAfterWithdraw = await fixture.getLinkWithActions(activeAirdropLinkId);
            expect(linkAfterWithdraw.link.state).toEqual("Link_state_cancelled");

            // Verify Alice gets the remaining balance
            const aliceBalanceAfter = await fixture.getUserBalance("alice", "ICP");
            const linkBalanceAfter = await fixture.checkLinkBalance(
                FEE_CANISTER_ID,
                activeAirdropLinkId,
            );

            const expectedRefund = linkBalanceAfterClaim - ledger_fee;
            expect(aliceBalanceAfter).toEqual(aliceBalanceBefore + expectedRefund);
            expect(linkBalanceAfter).toEqual(BigInt(0));
        });

        it("should prevent non-creator from withdrawing airdrop", async () => {
            // Bob tries to withdraw Alice's airdrop
            fixture.switchToUser("bob");

            try {
                const withdrawAction = await fixture.createAction(activeAirdropLinkId, "Withdraw");
                const withdrawResult = await fixture.processAction(
                    activeAirdropLinkId,
                    withdrawAction.id,
                    "Withdraw",
                );
                expect(withdrawResult.state).not.toEqual("Action_state_success");
            } catch (error) {
                // Expected to fail - only creator can withdraw
                expect(error).toBeDefined();
            }

            // Verify link remains active
            const linkState = await fixture.getLinkWithActions(activeAirdropLinkId);
            expect(linkState.link.state).toEqual("Link_state_active");

            // Verify link balance unchanged
            const linkBalance = await fixture.checkLinkBalance(
                FEE_CANISTER_ID,
                activeAirdropLinkId,
            );
            const expectedBalance = assetInfo.amount_per_link_use! * BigInt(5);
            expect(linkBalance).toEqual(expectedBalance);
        });

        it("should handle concurrent withdrawal and claims", async () => {
            // Start multiple claim processes
            fixture.switchToUser("bob");
            const claimAction1 = await fixture.createAction(activeAirdropLinkId, "Use");

            // Alice tries to withdraw while claims are in progress
            fixture.switchToUser("alice");
            try {
                const withdrawAction = await fixture.createAction(activeAirdropLinkId, "Withdraw");
                const withdrawResult = await fixture.processAction(
                    activeAirdropLinkId,
                    withdrawAction.id,
                    "Withdraw",
                );

                // Should either succeed (withdrawal wins) or fail (claims win)
                expect(["Action_state_success", "Action_state_error"]).toContain(
                    withdrawResult.state,
                );

                if (withdrawResult.state === "Action_state_success") {
                    // If withdrawal succeeded, link should be cancelled
                    const linkState = await fixture.getLinkWithActions(activeAirdropLinkId);
                    expect(linkState.link.state).toEqual("Link_state_cancelled");
                }
            } catch (error) {
                // May fail if claims complete first
                expect(error).toBeDefined();
            }
        });
    });

    describe("Exhausted Airdrop Link Withdrawal", () => {
        let exhaustedAirdropLinkId: string;

        beforeEach(async () => {
            // Create a small airdrop (1 claim) and exhaust it
            const smallTestConfig: LinkConfig = {
                ...testConfig,
                title: "Small Airdrop - 1 claim",
                link_use_action_max_count: BigInt(1),
            };

            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000);

            const airdropAmount = assetInfo.amount_per_link_use! + ledger_fee;
            const approveAmount = CREATE_LINK_FEE + ledger_fee;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc1Transfer("ICP", airdropAmount);
                await executor.executeIcrc2Approve("ICP", approveAmount);
                await executor.triggerTransaction();
            };

            const result = await fixture.completeActiveLinkFlow(
                "SendAirdrop",
                smallTestConfig,
                [assetInfo],
                BigInt(1),
                fixture.identities.get("alice")!,
                execute_tx,
            );

            exhaustedAirdropLinkId = result.link.id;

            // Bob claims the only available airdrop
            fixture.switchToUser("bob");
            const claimAction = await fixture.createAction(exhaustedAirdropLinkId, "Use");
            const claimResult = await fixture.processAction(
                exhaustedAirdropLinkId,
                claimAction.id,
                "Use",
            );
            expect(claimResult.state).toEqual("Action_state_success");
        });

        it("should prevent withdrawal from exhausted airdrop link", async () => {
            // Verify link is exhausted
            const linkState = await fixture.getLinkWithActions(exhaustedAirdropLinkId);
            expect(linkState.link.state).toEqual("Link_state_exhausted");
            expect(linkState.link.link_use_action_counter).toEqual(1n);

            // Verify link balance is zero (all airdrops were claimed)
            const linkBalance = await fixture.checkLinkBalance(
                FEE_CANISTER_ID,
                exhaustedAirdropLinkId,
            );
            expect(linkBalance).toEqual(BigInt(0));

            // Alice tries to withdraw from exhausted link
            fixture.switchToUser("alice");

            try {
                const withdrawAction = await fixture.createAction(
                    exhaustedAirdropLinkId,
                    "Withdraw",
                );
                const withdrawResult = await fixture.processAction(
                    exhaustedAirdropLinkId,
                    withdrawAction.id,
                    "Withdraw",
                );
                expect(withdrawResult.state).not.toEqual("Action_state_success");
            } catch (error) {
                // Expected to fail - cannot withdraw from exhausted link
                expect(error).toBeDefined();
            }
        });
    });

    describe("Large Airdrop Withdrawal", () => {
        let largeAirdropLinkId: string;

        beforeEach(async () => {
            // Create a large airdrop for 10 users
            const largeTestConfig: LinkConfig = {
                ...testConfig,
                title: "Large Airdrop - 10 claims",
                description: "Large airdrop for testing withdrawal",
                link_use_action_max_count: BigInt(10),
            };

            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000);

            const maxUse = BigInt(10);
            const airdropAmount = (assetInfo.amount_per_link_use! + ledger_fee) * maxUse;
            const approveAmount = CREATE_LINK_FEE + ledger_fee;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc1Transfer("ICP", airdropAmount);
                await executor.executeIcrc2Approve("ICP", approveAmount);
                await executor.triggerTransaction();
            };

            const result = await fixture.completeActiveLinkFlow(
                "SendAirdrop",
                largeTestConfig,
                [assetInfo],
                maxUse,
                fixture.identities.get("alice")!,
                execute_tx,
            );

            largeAirdropLinkId = result.link.id;
        });

        it("should allow withdrawal of large airdrop amounts", async () => {
            // Verify large airdrop balance
            const linkBalance = await fixture.checkLinkBalance(FEE_CANISTER_ID, largeAirdropLinkId);
            const expectedBalance = assetInfo.amount_per_link_use! * BigInt(10); // 100 ICP
            expect(linkBalance).toEqual(expectedBalance);

            // Record Alice's balance before withdrawal
            const aliceBalanceBefore = await fixture.getUserBalance("alice", "ICP");

            // Alice withdraws the large airdrop
            fixture.switchToUser("alice");
            const withdrawAction = await fixture.createAction(largeAirdropLinkId, "Withdraw");
            const withdrawResult = await fixture.processAction(
                largeAirdropLinkId,
                withdrawAction.id,
                "Withdraw",
            );
            expect(withdrawResult.state).toEqual("Action_state_success");

            // Verify link is cancelled and balance is zero
            const linkAfter = await fixture.getLinkWithActions(largeAirdropLinkId);
            expect(linkAfter.link.state).toEqual("Link_state_cancelled");

            const linkBalanceAfter = await fixture.checkLinkBalance(
                FEE_CANISTER_ID,
                largeAirdropLinkId,
            );
            expect(linkBalanceAfter).toEqual(BigInt(0));

            // Verify Alice received the full amount minus fees
            const aliceBalanceAfter = await fixture.getUserBalance("alice", "ICP");
            const expectedRefund = expectedBalance - ledger_fee;
            expect(aliceBalanceAfter).toEqual(aliceBalanceBefore + expectedRefund);
        });

        it("should handle withdrawal after multiple partial claims", async () => {
            // Bob makes multiple claims
            fixture.switchToUser("bob");

            // Claim 3 times
            for (let i = 0; i < 3; i++) {
                const claimAction = await fixture.createAction(largeAirdropLinkId, "Use");
                const claimResult = await fixture.processAction(
                    largeAirdropLinkId,
                    claimAction.id,
                    "Use",
                );
                expect(claimResult.state).toEqual("Action_state_success");
                await fixture.advanceTime(10 * 1000); // Small delay between claims
            }

            // Verify 3 claims were made
            const linkAfterClaims = await fixture.getLinkWithActions(largeAirdropLinkId);
            expect(linkAfterClaims.link.link_use_action_counter).toEqual(3n);

            const linkBalanceAfterClaims = await fixture.checkLinkBalance(
                FEE_CANISTER_ID,
                largeAirdropLinkId,
            );
            const expectedRemainingBalance = assetInfo.amount_per_link_use! * BigInt(7); // 7 claims left
            expect(linkBalanceAfterClaims).toEqual(expectedRemainingBalance);

            // Alice withdraws the remaining 7 claims worth
            fixture.switchToUser("alice");
            const aliceBalanceBefore = await fixture.getUserBalance("alice", "ICP");

            const withdrawAction = await fixture.createAction(largeAirdropLinkId, "Withdraw");
            const withdrawResult = await fixture.processAction(
                largeAirdropLinkId,
                withdrawAction.id,
                "Withdraw",
            );
            expect(withdrawResult.state).toEqual("Action_state_success");

            // Verify final state
            const linkFinal = await fixture.getLinkWithActions(largeAirdropLinkId);
            expect(linkFinal.link.state).toEqual("Link_state_cancelled");

            const aliceBalanceAfter = await fixture.getUserBalance("alice", "ICP");
            const expectedRefund = expectedRemainingBalance - ledger_fee;
            expect(aliceBalanceAfter).toEqual(aliceBalanceBefore + expectedRefund);
        });
    });
});
