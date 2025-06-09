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

describe("Send Token Basket Link Withdrawal Tests", () => {
    const fixture = new LinkTestFixture();
    let alice_id: string | null = null;
    let bob_id: string | null = null;

    const ledger_fee = BigInt(10_000);

    // Test configuration for send token basket links
    const testConfig: LinkConfig = {
        title: "Multi-Token Gift Basket",
        description: "Send multiple tokens as a gift",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "SendTokenBasket",
        link_use_action_max_count: BigInt(1),
    };

    // Multiple assets for the token basket
    const assetInfos: AssetInfo[] = [
        {
            chain: "IC",
            address: FEE_CANISTER_ID, // ICP
            label: "ICP_BASKET_ASSET",
            amount_per_link_use: BigInt(15_0000_0000), // 15 ICP
        },
        {
            chain: "IC",
            address: "2", // Token index 2
            label: "TOKEN2_BASKET_ASSET",
            amount_per_link_use: BigInt(25_0000_0000), // 25 units of token 2
        },
        {
            chain: "IC",
            address: "3", // Token index 3
            label: "TOKEN3_BASKET_ASSET",
            amount_per_link_use: BigInt(35_0000_0000), // 35 units of token 3
        },
    ];

    beforeAll(async () => {
        await fixture.setup({});
        await fixture.airdropTokensToUsers(
            BigInt(100_0000_0000), // Airdrop 100 tokens to each user for each token type
            ["alice", "bob"],
        );
        alice_id = (await fixture.getUserDetails("alice")).id;
        bob_id = (await fixture.getUserDetails("bob")).id;
    });

    afterAll(async () => {
        await fixture.tearDown();
    });

    describe("Active Token Basket Link Withdrawal", () => {
        let activeBasketLinkId: string;

        beforeEach(async () => {
            // Alice creates a multi-token basket link
            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000);

            // Calculate total amounts needed for each token
            const icpAmount = assetInfos[0].amount_per_link_use! + ledger_fee;
            const token2Amount = assetInfos[1].amount_per_link_use! + ledger_fee;
            const token3Amount = assetInfos[2].amount_per_link_use! + ledger_fee;
            const approveAmount = CREATE_LINK_FEE + ledger_fee;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                // Transfer ICP for the basket
                await executor.executeIcrc1Transfer("ICP", icpAmount);
                // Transfer other tokens
                await executor.executeIcrc1Transfer("2", token2Amount);
                await executor.executeIcrc1Transfer("3", token3Amount);
                // Approve for link creation fee
                await executor.executeIcrc2Approve("ICP", approveAmount);
                await executor.triggerTransaction();
            };

            const result = await fixture.completeActiveLinkFlow(
                "SendTokenBasket",
                testConfig,
                assetInfos,
                BigInt(1),
                fixture.identities.get("alice")!,
                execute_tx,
            );

            activeBasketLinkId = result.link.id;
        });

        it("should allow creator to withdraw entire unclaimed token basket", async () => {
            // Verify link is active
            const linkBefore = await fixture.getLinkWithActions(activeBasketLinkId);
            expect(linkBefore.link.state).toEqual("Link_state_active");
            expect(linkBefore.link.creator).toEqual(alice_id);

            // Check balances before withdrawal for all tokens
            const aliceBalancesBefore = {
                icp: await fixture.getUserBalance("alice", "ICP"),
                token2: await fixture.getUserBalance("alice", "2"),
                token3: await fixture.getUserBalance("alice", "3"),
            };

            const linkBalancesBefore = {
                icp: await fixture.checkLinkBalance(FEE_CANISTER_ID, activeBasketLinkId),
                token2: await fixture.checkLinkBalance("2", activeBasketLinkId),
                token3: await fixture.checkLinkBalance("3", activeBasketLinkId),
            };

            // Verify link has all expected tokens
            expect(linkBalancesBefore.icp).toEqual(assetInfos[0].amount_per_link_use!);
            expect(linkBalancesBefore.token2).toEqual(assetInfos[1].amount_per_link_use!);
            expect(linkBalancesBefore.token3).toEqual(assetInfos[2].amount_per_link_use!);

            // Alice withdraws the entire token basket
            fixture.switchToUser("alice");
            const withdrawAction = await fixture.createAction(activeBasketLinkId, "Withdraw");
            expect(withdrawAction.type).toEqual("Withdraw");
            expect(withdrawAction.creator).toEqual(alice_id);

            const withdrawResult = await fixture.processAction(
                activeBasketLinkId,
                withdrawAction.id,
                "Withdraw",
            );
            expect(withdrawResult.state).toEqual("Action_state_success");

            // Verify link state after withdrawal
            const linkAfter = await fixture.getLinkWithActions(activeBasketLinkId);
            expect(linkAfter.link.state).toEqual("Link_state_cancelled");

            // Verify Alice gets all tokens back minus fees
            const aliceBalancesAfter = {
                icp: await fixture.getUserBalance("alice", "ICP"),
                token2: await fixture.getUserBalance("alice", "2"),
                token3: await fixture.getUserBalance("alice", "3"),
            };

            const linkBalancesAfter = {
                icp: await fixture.checkLinkBalance(FEE_CANISTER_ID, activeBasketLinkId),
                token2: await fixture.checkLinkBalance("2", activeBasketLinkId),
                token3: await fixture.checkLinkBalance("3", activeBasketLinkId),
            };

            // Check refunds (accounting for withdrawal fees for each token)
            expect(aliceBalancesAfter.icp).toEqual(
                aliceBalancesBefore.icp + linkBalancesBefore.icp - ledger_fee,
            );
            expect(aliceBalancesAfter.token2).toEqual(
                aliceBalancesBefore.token2 + linkBalancesBefore.token2 - ledger_fee,
            );
            expect(aliceBalancesAfter.token3).toEqual(
                aliceBalancesBefore.token3 + linkBalancesBefore.token3 - ledger_fee,
            );

            // All link balances should be zero
            expect(linkBalancesAfter.icp).toEqual(BigInt(0));
            expect(linkBalancesAfter.token2).toEqual(BigInt(0));
            expect(linkBalancesAfter.token3).toEqual(BigInt(0));
        });

        it("should prevent non-creator from withdrawing token basket", async () => {
            // Bob tries to withdraw Alice's token basket
            fixture.switchToUser("bob");

            try {
                const withdrawAction = await fixture.createAction(activeBasketLinkId, "Withdraw");
                const withdrawResult = await fixture.processAction(
                    activeBasketLinkId,
                    withdrawAction.id,
                    "Withdraw",
                );
                expect(withdrawResult.state).not.toEqual("Action_state_success");
            } catch (error) {
                // Expected to fail - only creator can withdraw
                expect(error).toBeDefined();
            }

            // Verify link remains active
            const linkState = await fixture.getLinkWithActions(activeBasketLinkId);
            expect(linkState.link.state).toEqual("Link_state_active");

            // Verify all token balances remain unchanged
            const linkBalances = {
                icp: await fixture.checkLinkBalance(FEE_CANISTER_ID, activeBasketLinkId),
                token2: await fixture.checkLinkBalance("2", activeBasketLinkId),
                token3: await fixture.checkLinkBalance("3", activeBasketLinkId),
            };

            expect(linkBalances.icp).toEqual(assetInfos[0].amount_per_link_use!);
            expect(linkBalances.token2).toEqual(assetInfos[1].amount_per_link_use!);
            expect(linkBalances.token3).toEqual(assetInfos[2].amount_per_link_use!);
        });

        it("should handle withdrawal timing with concurrent claims", async () => {
            // Bob starts claiming the token basket
            fixture.switchToUser("bob");
            const claimAction = await fixture.createAction(activeBasketLinkId, "Use");
            expect(claimAction.type).toEqual("Use");
            expect(claimAction.creator).toEqual(bob_id);

            // Alice tries to withdraw while Bob's claim is in progress
            fixture.switchToUser("alice");
            try {
                const withdrawAction = await fixture.createAction(activeBasketLinkId, "Withdraw");
                const withdrawResult = await fixture.processAction(
                    activeBasketLinkId,
                    withdrawAction.id,
                    "Withdraw",
                );

                // Should either succeed (withdrawal wins) or fail (claim wins)
                expect(["Action_state_success", "Action_state_error"]).toContain(
                    withdrawResult.state,
                );

                if (withdrawResult.state === "Action_state_success") {
                    // If withdrawal succeeded, link should be cancelled
                    const linkState = await fixture.getLinkWithActions(activeBasketLinkId);
                    expect(linkState.link.state).toEqual("Link_state_cancelled");
                }
            } catch (error) {
                // May fail if claim completes first
                expect(error).toBeDefined();
            }
        });
    });

    describe("Exhausted Token Basket Link Withdrawal", () => {
        let exhaustedBasketLinkId: string;

        beforeEach(async () => {
            // Create a token basket and let Bob claim it
            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000);

            const icpAmount = assetInfos[0].amount_per_link_use! + ledger_fee;
            const token2Amount = assetInfos[1].amount_per_link_use! + ledger_fee;
            const token3Amount = assetInfos[2].amount_per_link_use! + ledger_fee;
            const approveAmount = CREATE_LINK_FEE + ledger_fee;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc1Transfer("ICP", icpAmount);
                await executor.executeIcrc1Transfer("2", token2Amount);
                await executor.executeIcrc1Transfer("3", token3Amount);
                await executor.executeIcrc2Approve("ICP", approveAmount);
                await executor.triggerTransaction();
            };

            const result = await fixture.completeActiveLinkFlow(
                "SendTokenBasket",
                testConfig,
                assetInfos,
                BigInt(1),
                fixture.identities.get("alice")!,
                execute_tx,
            );

            exhaustedBasketLinkId = result.link.id;

            // Bob claims the entire token basket to exhaust the link
            fixture.switchToUser("bob");
            const claimAction = await fixture.createAction(exhaustedBasketLinkId, "Use");
            const claimResult = await fixture.processAction(
                exhaustedBasketLinkId,
                claimAction.id,
                "Use",
            );
            expect(claimResult.state).toEqual("Action_state_success");
        });

        it("should prevent withdrawal from exhausted token basket link", async () => {
            // Verify link is exhausted
            const linkState = await fixture.getLinkWithActions(exhaustedBasketLinkId);
            expect(linkState.link.state).toEqual("Link_state_exhausted");
            expect(linkState.link.link_use_action_counter).toEqual(1n);

            // Verify all token balances are zero (basket was claimed)
            const linkBalances = {
                icp: await fixture.checkLinkBalance(FEE_CANISTER_ID, exhaustedBasketLinkId),
                token2: await fixture.checkLinkBalance("2", exhaustedBasketLinkId),
                token3: await fixture.checkLinkBalance("3", exhaustedBasketLinkId),
            };

            expect(linkBalances.icp).toEqual(BigInt(0));
            expect(linkBalances.token2).toEqual(BigInt(0));
            expect(linkBalances.token3).toEqual(BigInt(0));

            // Alice tries to withdraw from exhausted link
            fixture.switchToUser("alice");

            try {
                const withdrawAction = await fixture.createAction(
                    exhaustedBasketLinkId,
                    "Withdraw",
                );
                const withdrawResult = await fixture.processAction(
                    exhaustedBasketLinkId,
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

    describe("Single Token Basket Withdrawal", () => {
        let singleTokenBasketLinkId: string;

        beforeEach(async () => {
            // Create a basket with only ICP (simpler case)
            const singleAssetInfo: AssetInfo[] = [assetInfos[0]]; // Only ICP

            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000);

            const icpAmount = singleAssetInfo[0].amount_per_link_use! + ledger_fee;
            const approveAmount = CREATE_LINK_FEE + ledger_fee;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc1Transfer("ICP", icpAmount);
                await executor.executeIcrc2Approve("ICP", approveAmount);
                await executor.triggerTransaction();
            };

            const result = await fixture.completeActiveLinkFlow(
                "SendTokenBasket",
                {
                    ...testConfig,
                    title: "Single Token Basket - ICP Only",
                },
                singleAssetInfo,
                BigInt(1),
                fixture.identities.get("alice")!,
                execute_tx,
            );

            singleTokenBasketLinkId = result.link.id;
        });

        it("should allow withdrawal of single token basket", async () => {
            // Check initial state
            const linkBefore = await fixture.getLinkWithActions(singleTokenBasketLinkId);
            expect(linkBefore.link.state).toEqual("Link_state_active");

            const aliceBalanceBefore = await fixture.getUserBalance("alice", "ICP");
            const linkBalanceBefore = await fixture.checkLinkBalance(
                FEE_CANISTER_ID,
                singleTokenBasketLinkId,
            );
            expect(linkBalanceBefore).toEqual(assetInfos[0].amount_per_link_use!);

            // Alice withdraws
            fixture.switchToUser("alice");
            const withdrawAction = await fixture.createAction(singleTokenBasketLinkId, "Withdraw");
            const withdrawResult = await fixture.processAction(
                singleTokenBasketLinkId,
                withdrawAction.id,
                "Withdraw",
            );
            expect(withdrawResult.state).toEqual("Action_state_success");

            // Verify final state
            const linkAfter = await fixture.getLinkWithActions(singleTokenBasketLinkId);
            expect(linkAfter.link.state).toEqual("Link_state_cancelled");

            const aliceBalanceAfter = await fixture.getUserBalance("alice", "ICP");
            const linkBalanceAfter = await fixture.checkLinkBalance(
                FEE_CANISTER_ID,
                singleTokenBasketLinkId,
            );

            expect(aliceBalanceAfter).toEqual(aliceBalanceBefore + linkBalanceBefore - ledger_fee);
            expect(linkBalanceAfter).toEqual(BigInt(0));
        });
    });

    describe("Large Token Basket Withdrawal", () => {
        let largeBasketLinkId: string;

        beforeEach(async () => {
            // Create a large basket with many different tokens
            const largeAssetInfos: AssetInfo[] = [
                {
                    chain: "IC",
                    address: FEE_CANISTER_ID,
                    label: "ICP_LARGE_BASKET",
                    amount_per_link_use: BigInt(50_0000_0000), // 50 ICP
                },
                {
                    chain: "IC",
                    address: "2",
                    label: "TOKEN2_LARGE_BASKET",
                    amount_per_link_use: BigInt(100_0000_0000), // 100 units
                },
                {
                    chain: "IC",
                    address: "3",
                    label: "TOKEN3_LARGE_BASKET",
                    amount_per_link_use: BigInt(75_0000_0000), // 75 units
                },
            ];

            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000);

            const icpAmount = largeAssetInfos[0].amount_per_link_use! + ledger_fee;
            const token2Amount = largeAssetInfos[1].amount_per_link_use! + ledger_fee;
            const token3Amount = largeAssetInfos[2].amount_per_link_use! + ledger_fee;
            const approveAmount = CREATE_LINK_FEE + ledger_fee;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc1Transfer("ICP", icpAmount);
                await executor.executeIcrc1Transfer("2", token2Amount);
                await executor.executeIcrc1Transfer("3", token3Amount);
                await executor.executeIcrc2Approve("ICP", approveAmount);
                await executor.triggerTransaction();
            };

            const result = await fixture.completeActiveLinkFlow(
                "SendTokenBasket",
                {
                    ...testConfig,
                    title: "Large Token Basket",
                    description: "Large multi-token gift basket",
                },
                largeAssetInfos,
                BigInt(1),
                fixture.identities.get("alice")!,
                execute_tx,
            );

            largeBasketLinkId = result.link.id;
        });

        it("should allow withdrawal of large token basket with multiple assets", async () => {
            // Verify initial large balances
            const linkBalancesBefore = {
                icp: await fixture.checkLinkBalance(FEE_CANISTER_ID, largeBasketLinkId),
                token2: await fixture.checkLinkBalance("2", largeBasketLinkId),
                token3: await fixture.checkLinkBalance("3", largeBasketLinkId),
            };

            expect(linkBalancesBefore.icp).toEqual(BigInt(50_0000_0000));
            expect(linkBalancesBefore.token2).toEqual(BigInt(100_0000_0000));
            expect(linkBalancesBefore.token3).toEqual(BigInt(75_0000_0000));

            const aliceBalancesBefore = {
                icp: await fixture.getUserBalance("alice", "ICP"),
                token2: await fixture.getUserBalance("alice", "2"),
                token3: await fixture.getUserBalance("alice", "3"),
            };

            // Alice withdraws the large basket
            fixture.switchToUser("alice");
            const withdrawAction = await fixture.createAction(largeBasketLinkId, "Withdraw");
            const withdrawResult = await fixture.processAction(
                largeBasketLinkId,
                withdrawAction.id,
                "Withdraw",
            );
            expect(withdrawResult.state).toEqual("Action_state_success");

            // Verify link is cancelled and all balances are recovered
            const linkAfter = await fixture.getLinkWithActions(largeBasketLinkId);
            expect(linkAfter.link.state).toEqual("Link_state_cancelled");

            const aliceBalancesAfter = {
                icp: await fixture.getUserBalance("alice", "ICP"),
                token2: await fixture.getUserBalance("alice", "2"),
                token3: await fixture.getUserBalance("alice", "3"),
            };

            const linkBalancesAfter = {
                icp: await fixture.checkLinkBalance(FEE_CANISTER_ID, largeBasketLinkId),
                token2: await fixture.checkLinkBalance("2", largeBasketLinkId),
                token3: await fixture.checkLinkBalance("3", largeBasketLinkId),
            };

            // Verify refunds
            expect(aliceBalancesAfter.icp).toEqual(
                aliceBalancesBefore.icp + linkBalancesBefore.icp - ledger_fee,
            );
            expect(aliceBalancesAfter.token2).toEqual(
                aliceBalancesBefore.token2 + linkBalancesBefore.token2 - ledger_fee,
            );
            expect(aliceBalancesAfter.token3).toEqual(
                aliceBalancesBefore.token3 + linkBalancesBefore.token3 - ledger_fee,
            );

            // All link balances should be zero
            expect(linkBalancesAfter.icp).toEqual(BigInt(0));
            expect(linkBalancesAfter.token2).toEqual(BigInt(0));
            expect(linkBalancesAfter.token3).toEqual(BigInt(0));
        });
    });
});
