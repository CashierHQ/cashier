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

describe("Send Tip Link Withdrawal Tests", () => {
    const fixture = new LinkTestFixture();
    let alice_id: string | null = null;
    let bob_id: string | null = null;

    const ledger_fee = BigInt(10_000);

    // Test configuration for send tip links
    const testConfig: LinkConfig = {
        title: "Tip 20 ICP",
        description: "Send a tip of 20 ICP to the user",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "SendTip",
        link_use_action_max_count: BigInt(1),
    };

    const assetInfo: AssetInfo = {
        chain: "IC",
        address: FEE_CANISTER_ID,
        label: "SEND_TIP_ASSET",
        amount_per_link_use: BigInt(20_0000_0000), // 20 ICP tip
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

    describe("Active Tip Link Withdrawal", () => {
        let activeTipLinkId: string;

        beforeEach(async () => {
            // Alice creates a send tip link with 20 ICP
            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000);

            const tipAmount = assetInfo.amount_per_link_use! + ledger_fee;
            const approveAmount = CREATE_LINK_FEE + ledger_fee;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc1Transfer("ICP", tipAmount);
                await executor.executeIcrc2Approve("ICP", approveAmount);
                await executor.triggerTransaction();
            };

            const result = await fixture.completeActiveLinkFlow(
                "SendTip",
                testConfig,
                [assetInfo],
                BigInt(1),
                fixture.identities.get("alice")!,
                execute_tx,
            );

            activeTipLinkId = result.link.id;
        });

        it("should allow creator to withdraw unclaimed tip", async () => {
            // Verify link is active and has funds
            const linkBefore = await fixture.getLinkWithActions(activeTipLinkId);
            expect(linkBefore.link.state).toEqual("Link_state_active");
            expect(linkBefore.link.creator).toEqual(alice_id);

            // Check balances before withdrawal
            const aliceBalanceBefore = await fixture.getUserBalance("alice", "ICP");
            const linkBalanceBefore = await fixture.checkLinkBalance(
                FEE_CANISTER_ID,
                activeTipLinkId,
            );
            expect(linkBalanceBefore).toEqual(assetInfo.amount_per_link_use!);

            // Alice withdraws the unclaimed tip
            fixture.switchToUser("alice");
            const withdrawAction = await fixture.createAction(activeTipLinkId, "Withdraw");
            expect(withdrawAction.type).toEqual("Withdraw");
            expect(withdrawAction.creator).toEqual(alice_id);

            const withdrawResult = await fixture.processAction(
                activeTipLinkId,
                withdrawAction.id,
                "Withdraw",
            );
            expect(withdrawResult.state).toEqual("Action_state_success");

            // Verify link state after withdrawal
            const linkAfter = await fixture.getLinkWithActions(activeTipLinkId);
            expect(linkAfter.link.state).toEqual("Link_state_cancelled");

            // Verify Alice gets her tip back minus fees
            const aliceBalanceAfter = await fixture.getUserBalance("alice", "ICP");
            const linkBalanceAfter = await fixture.checkLinkBalance(
                FEE_CANISTER_ID,
                activeTipLinkId,
            );

            const expectedRefund = linkBalanceBefore - ledger_fee; // Minus withdrawal fee
            expect(aliceBalanceAfter).toEqual(aliceBalanceBefore + expectedRefund);
            expect(linkBalanceAfter).toEqual(BigInt(0));
        });

        it("should prevent non-creator from withdrawing tip", async () => {
            // Bob tries to withdraw Alice's tip link
            fixture.switchToUser("bob");

            try {
                const withdrawAction = await fixture.createAction(activeTipLinkId, "Withdraw");
                const withdrawResult = await fixture.processAction(
                    activeTipLinkId,
                    withdrawAction.id,
                    "Withdraw",
                );
                expect(withdrawResult.state).not.toEqual("Action_state_success");
            } catch (error) {
                // Expected to fail - only creator can withdraw
                expect(error).toBeDefined();
            }

            // Verify link remains active
            const linkState = await fixture.getLinkWithActions(activeTipLinkId);
            expect(linkState.link.state).toEqual("Link_state_active");

            // Verify link balance unchanged
            const linkBalance = await fixture.checkLinkBalance(FEE_CANISTER_ID, activeTipLinkId);
            expect(linkBalance).toEqual(assetInfo.amount_per_link_use!);
        });

        it("should handle withdrawal timing edge cases", async () => {
            // Bob starts claiming the tip
            fixture.switchToUser("bob");
            const claimAction = await fixture.createAction(activeTipLinkId, "Use");
            expect(claimAction.type).toEqual("Use");
            expect(claimAction.creator).toEqual(bob_id);

            // Alice tries to withdraw while Bob's claim is in progress
            fixture.switchToUser("alice");
            try {
                const withdrawAction = await fixture.createAction(activeTipLinkId, "Withdraw");
                const withdrawResult = await fixture.processAction(
                    activeTipLinkId,
                    withdrawAction.id,
                    "Withdraw",
                );

                // Should either succeed (withdrawal wins) or fail (claim wins)
                expect(["Action_state_success", "Action_state_error"]).toContain(
                    withdrawResult.state,
                );

                if (withdrawResult.state === "Action_state_success") {
                    // If withdrawal succeeded, link should be cancelled
                    const linkState = await fixture.getLinkWithActions(activeTipLinkId);
                    expect(linkState.link.state).toEqual("Link_state_cancelled");
                }
            } catch (error) {
                // May fail if claim completes first
                expect(error).toBeDefined();
            }
        });
    });

    describe("Exhausted Tip Link Withdrawal", () => {
        let exhaustedTipLinkId: string;

        beforeEach(async () => {
            // Create a tip link and let Bob claim it
            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000);

            const tipAmount = assetInfo.amount_per_link_use! + ledger_fee;
            const approveAmount = CREATE_LINK_FEE + ledger_fee;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc1Transfer("ICP", tipAmount);
                await executor.executeIcrc2Approve("ICP", approveAmount);
                await executor.triggerTransaction();
            };

            const result = await fixture.completeActiveLinkFlow(
                "SendTip",
                testConfig,
                [assetInfo],
                BigInt(1),
                fixture.identities.get("alice")!,
                execute_tx,
            );

            exhaustedTipLinkId = result.link.id;

            // Bob claims the tip to exhaust the link
            fixture.switchToUser("bob");
            const claimAction = await fixture.createAction(exhaustedTipLinkId, "Use");
            const claimResult = await fixture.processAction(
                exhaustedTipLinkId,
                claimAction.id,
                "Use",
            );
            expect(claimResult.state).toEqual("Action_state_success");
        });

        it("should prevent withdrawal from exhausted tip link", async () => {
            // Verify link is exhausted
            const linkState = await fixture.getLinkWithActions(exhaustedTipLinkId);
            expect(linkState.link.state).toEqual("Link_state_exhausted");
            expect(linkState.link.link_use_action_counter).toEqual(1n);

            // Verify link balance is zero (tip was claimed)
            const linkBalance = await fixture.checkLinkBalance(FEE_CANISTER_ID, exhaustedTipLinkId);
            expect(linkBalance).toEqual(BigInt(0));

            // Alice tries to withdraw from exhausted link
            fixture.switchToUser("alice");

            try {
                const withdrawAction = await fixture.createAction(exhaustedTipLinkId, "Withdraw");
                const withdrawResult = await fixture.processAction(
                    exhaustedTipLinkId,
                    withdrawAction.id,
                    "Withdraw",
                );
                expect(withdrawResult.state).not.toEqual("Action_state_success");
            } catch (error) {
                // Expected to fail - cannot withdraw from exhausted link
                expect(error).toBeDefined();
            }
        });

        it("should maintain exhausted state after failed withdrawal", async () => {
            // Alice tries to withdraw
            fixture.switchToUser("alice");

            try {
                const withdrawAction = await fixture.createAction(exhaustedTipLinkId, "Withdraw");
                await fixture.processAction(exhaustedTipLinkId, withdrawAction.id, "Withdraw");
            } catch (error) {
                // Expected to fail
            }

            // Verify link remains exhausted
            const linkState = await fixture.getLinkWithActions(exhaustedTipLinkId);
            expect(linkState.link.state).toEqual("Link_state_exhausted");
        });
    });

    describe("Multiple Tip Links Withdrawal", () => {
        let tipLinkIds: string[] = [];

        beforeEach(async () => {
            // Alice creates multiple tip links
            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000);

            for (let i = 0; i < 3; i++) {
                const tipAmount = assetInfo.amount_per_link_use! + ledger_fee;
                const approveAmount = CREATE_LINK_FEE + ledger_fee;

                const execute_tx = async (executor: Icrc112ExecutorV2) => {
                    await executor.executeIcrc1Transfer("ICP", tipAmount);
                    await executor.executeIcrc2Approve("ICP", approveAmount);
                    await executor.triggerTransaction();
                };

                const result = await fixture.completeActiveLinkFlow(
                    "SendTip",
                    {
                        ...testConfig,
                        title: `Tip ${i + 1} - 20 ICP`,
                    },
                    [assetInfo],
                    BigInt(1),
                    fixture.identities.get("alice")!,
                    execute_tx,
                );

                tipLinkIds.push(result.link.id);
                await fixture.advanceTime(30 * 1000); // Wait between creations
            }
        });

        it("should allow withdrawal from multiple active tip links", async () => {
            const aliceBalanceBefore = await fixture.getUserBalance("alice", "ICP");

            // Withdraw from all tip links
            let totalRefund = BigInt(0);
            for (const linkId of tipLinkIds) {
                fixture.switchToUser("alice");

                const linkBalanceBefore = await fixture.checkLinkBalance(FEE_CANISTER_ID, linkId);

                const withdrawAction = await fixture.createAction(linkId, "Withdraw");
                const withdrawResult = await fixture.processAction(
                    linkId,
                    withdrawAction.id,
                    "Withdraw",
                );
                expect(withdrawResult.state).toEqual("Action_state_success");

                const linkAfter = await fixture.getLinkWithActions(linkId);
                expect(linkAfter.link.state).toEqual("Link_state_cancelled");

                totalRefund += linkBalanceBefore - ledger_fee; // Minus withdrawal fee
            }

            // Verify total refund
            const aliceBalanceAfter = await fixture.getUserBalance("alice", "ICP");
            expect(aliceBalanceAfter).toEqual(aliceBalanceBefore + totalRefund);
        });

        afterEach(() => {
            tipLinkIds = [];
        });
    });
});
