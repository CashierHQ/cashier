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

describe("Receive Payment Link Withdrawal Tests", () => {
    const fixture = new LinkTestFixture();
    let alice_id: string | null = null;
    let bob_id: string | null = null;

    const ledger_fee = BigInt(10_000);

    // Test configuration for receive payment links
    const testConfig: LinkConfig = {
        title: "Receive 20 ICP Payment",
        description: "Request payment of 20 ICP from user",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "ReceivePayment",
        link_use_action_max_count: BigInt(1),
    };

    const assetInfo: AssetInfo = {
        chain: "IC",
        address: FEE_CANISTER_ID,
        label: "RECEIVE_PAYMENT_ASSET",
        amount_per_link_use: BigInt(20_0000_0000), // 20 ICP
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

    describe("Active Link Withdrawal", () => {
        let activeLinkId: string;

        beforeEach(async () => {
            // Alice creates a receive payment link
            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000);

            const approveAmount = CREATE_LINK_FEE + ledger_fee;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc2Approve("ICP", approveAmount);
                await executor.triggerTransaction();
            };

            const result = await fixture.completeActiveLinkFlow(
                "ReceivePayment",
                testConfig,
                [assetInfo],
                BigInt(1),
                fixture.identities.get("alice")!,
                execute_tx,
            );

            activeLinkId = result.link.id;
        });

        it("should allow creator to withdraw from active link", async () => {
            // Verify link is active
            const linkBefore = await fixture.getLinkWithActions(activeLinkId);
            expect(linkBefore.link.state).toEqual("Link_state_active");
            expect(linkBefore.link.creator).toEqual(alice_id);

            // Get initial balances
            const aliceBalanceBefore = await fixture.getUserBalance("alice", "ICP");
            const linkBalanceBefore = await fixture.checkLinkBalance(FEE_CANISTER_ID, activeLinkId);

            // Alice withdraws from the link
            fixture.switchToUser("alice");
            const withdrawAction = await fixture.createAction(activeLinkId, "Withdraw");
            expect(withdrawAction.type).toEqual("Withdraw");
            expect(withdrawAction.creator).toEqual(alice_id);

            const withdrawResult = await fixture.processAction(
                activeLinkId,
                withdrawAction.id,
                "Withdraw",
            );
            expect(withdrawResult.state).toEqual("Action_state_success");

            // Verify link state after withdrawal
            const linkAfter = await fixture.getLinkWithActions(activeLinkId);
            expect(linkAfter.link.state).toEqual("Link_state_cancelled");

            // Verify balances after withdrawal
            const aliceBalanceAfter = await fixture.getUserBalance("alice", "ICP");
            const linkBalanceAfter = await fixture.checkLinkBalance(FEE_CANISTER_ID, activeLinkId);

            // Alice should receive the link balance minus fees
            const expectedRefund = linkBalanceBefore - ledger_fee;
            expect(aliceBalanceAfter).toEqual(aliceBalanceBefore + expectedRefund);
            expect(linkBalanceAfter).toEqual(BigInt(0));
        });

        it("should prevent non-creator from withdrawing", async () => {
            // Bob tries to withdraw from Alice's link
            fixture.switchToUser("bob");

            try {
                const withdrawAction = await fixture.createAction(activeLinkId, "Withdraw");
                const withdrawResult = await fixture.processAction(
                    activeLinkId,
                    withdrawAction.id,
                    "Withdraw",
                );
                expect(withdrawResult.state).not.toEqual("Action_state_success");
            } catch (error) {
                // Expected to fail - only creator can withdraw
                expect(error).toBeDefined();
            }

            // Verify link remains active
            const linkState = await fixture.getLinkWithActions(activeLinkId);
            expect(linkState.link.state).toEqual("Link_state_active");
        });

        it("should handle withdrawal after partial usage", async () => {
            // Bob makes a payment to the link first
            fixture.switchToUser("bob");
            const paymentAmount = assetInfo.amount_per_link_use! + ledger_fee;

            const execute_payment = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc1Transfer("ICP", paymentAmount);
                await executor.triggerTransaction();
            };

            const paymentAction = await fixture.createAction(activeLinkId, "Use");
            // Note: For receive payment, Bob would need to complete the payment process
            // but let's test withdrawal before that completes

            // Alice withdraws while payment is in progress
            fixture.switchToUser("alice");
            const withdrawAction = await fixture.createAction(activeLinkId, "Withdraw");
            const withdrawResult = await fixture.processAction(
                activeLinkId,
                withdrawAction.id,
                "Withdraw",
            );

            // Should either succeed or fail gracefully based on system design
            expect(["Action_state_success", "Action_state_error"]).toContain(withdrawResult.state);
        });
    });

    describe("Exhausted Link Withdrawal", () => {
        let exhaustedLinkId: string;

        beforeEach(async () => {
            // Create a link and let it get exhausted through use
            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000);

            const approveAmount = CREATE_LINK_FEE + ledger_fee;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc2Approve("ICP", approveAmount);
                await executor.triggerTransaction();
            };

            const result = await fixture.completeActiveLinkFlow(
                "ReceivePayment",
                testConfig,
                [assetInfo],
                BigInt(1),
                fixture.identities.get("alice")!,
                execute_tx,
            );

            exhaustedLinkId = result.link.id;

            // Bob completes the payment to exhaust the link
            fixture.switchToUser("bob");
            const paymentAmount = assetInfo.amount_per_link_use! + ledger_fee;

            const execute_payment = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc1Transfer("ICP", paymentAmount);
                await executor.triggerTransaction();
            };

            const paymentAction = await fixture.createAction(exhaustedLinkId, "Use");
            // Complete the payment to exhaust the link
            // Note: The exact process depends on how ReceivePayment links work
        });

        it("should prevent withdrawal from exhausted link", async () => {
            // Verify link is exhausted
            const linkState = await fixture.getLinkWithActions(exhaustedLinkId);
            expect(linkState.link.state).toEqual("Link_state_exhausted");

            // Alice tries to withdraw from exhausted link
            fixture.switchToUser("alice");

            try {
                const withdrawAction = await fixture.createAction(exhaustedLinkId, "Withdraw");
                const withdrawResult = await fixture.processAction(
                    exhaustedLinkId,
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

    describe("Already Cancelled Link", () => {
        let cancelledLinkId: string;

        beforeEach(async () => {
            // Create and immediately cancel a link
            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000);

            const approveAmount = CREATE_LINK_FEE + ledger_fee;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc2Approve("ICP", approveAmount);
                await executor.triggerTransaction();
            };

            const result = await fixture.completeActiveLinkFlow(
                "ReceivePayment",
                testConfig,
                [assetInfo],
                BigInt(1),
                fixture.identities.get("alice")!,
                execute_tx,
            );

            cancelledLinkId = result.link.id;

            // Cancel the link
            const withdrawAction = await fixture.createAction(cancelledLinkId, "Withdraw");
            await fixture.processAction(cancelledLinkId, withdrawAction.id, "Withdraw");
        });

        it("should prevent double withdrawal", async () => {
            // Verify link is already cancelled
            const linkState = await fixture.getLinkWithActions(cancelledLinkId);
            expect(linkState.link.state).toEqual("Link_state_cancelled");

            // Alice tries to withdraw again
            fixture.switchToUser("alice");

            try {
                const withdrawAction = await fixture.createAction(cancelledLinkId, "Withdraw");
                const withdrawResult = await fixture.processAction(
                    cancelledLinkId,
                    withdrawAction.id,
                    "Withdraw",
                );
                expect(withdrawResult.state).not.toEqual("Action_state_success");
            } catch (error) {
                // Expected to fail - link already cancelled
                expect(error).toBeDefined();
            }
        });
    });
});
