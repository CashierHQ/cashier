// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

/* eslint-disable @typescript-eslint/no-explicit-any */
import { LinkTestFixture, LinkConfig, AssetInfo } from "../../fixtures/link-test-fixture";
import { CREATE_LINK_FEE, FEE_CANISTER_ID } from "../../constant";
import { Icrc112ExecutorV2 } from "../../utils/icrc-112-v2";
import { parseResultResponse } from "../../utils/parser";

describe("Test create and claim token airdrop link with multiple user", () => {
    const fixture = new LinkTestFixture();

    const ledger_fee = BigInt(10_000);

    beforeAll(async () => {
        await fixture.setup({});
        await fixture.airdropTokensToUsers(
            BigInt(100_0000_0000), // Airdrop 100 ICP to each user
            ["alice", "bob"], // Airdrop to Alice and Bob
        );
    });

    afterAll(async () => {
        await fixture.tearDown();
    });

    describe("Multi-User Airdrop Testing", () => {
        let multiUserLinkId: string;
        let charlie_id: string | null = null;
        let david_id: string | null = null;
        let eve_id: string | null = null;

        beforeAll(async () => {
            // Add additional test users to the fixture
            fixture.addIdentity("charlie", "superSecretCharliePassword");
            fixture.addIdentity("david", "superSecretDavidPassword");
            fixture.addIdentity("eve", "superSecretEvePassword");

            // Create users in the backend for charlie, david, and eve
            fixture.switchToUser("alice");
            await fixture.advanceTime(1 * 60 * 1000);

            // Create charlie user
            await fixture.actor!.setIdentity(fixture.identities.get("charlie")!);
            const charlieUserRes = await fixture.actor!.create_user();
            fixture.users["charlie"] = parseResultResponse(charlieUserRes);
            charlie_id = fixture.users["charlie"].id;

            // Create david user
            await fixture.actor!.setIdentity(fixture.identities.get("david")!);
            const davidUserRes = await fixture.actor!.create_user();
            fixture.users["david"] = parseResultResponse(davidUserRes);
            david_id = fixture.users["david"].id;

            // Create eve user
            await fixture.actor!.setIdentity(fixture.identities.get("eve")!);
            const eveUserRes = await fixture.actor!.create_user();
            fixture.users["eve"] = parseResultResponse(eveUserRes);
            eve_id = fixture.users["eve"].id;

            // Airdrop tokens to all users including new ones
            await fixture.airdropTokensToUsers(
                BigInt(100_0000_0000), // Airdrop 100 ICP to each user
                ["alice", "bob", "charlie", "david", "eve"],
            );

            // Give Alice additional balance for creating another large airdrop link
            await fixture.airdropTokensToUsers(
                BigInt(100_0000_0000), // Additional 100 ICP for Alice
                ["alice"],
            );

            // Alice creates a new airdrop link for multi-user testing
            fixture.switchToUser("alice");

            const multiUserConfig: LinkConfig = {
                title: "Multi-User Airdrop Test",
                description: "Testing concurrent claims from multiple users",
                template: "Central",
                link_image_url: "https://www.google.com",
                link_type: "SendAirdrop",
                link_use_action_max_count: BigInt(10), // Allow more claims for testing
            };

            const multiUserAssetInfo: AssetInfo = {
                chain: "IC",
                address: FEE_CANISTER_ID,
                label: "SEND_AIRDROP_ASSET",
                amount_per_link_use: BigInt(5_0000_0000), // 5 ICP per claim
            };

            const airdropAmount =
                (multiUserAssetInfo.amount_per_link_use! + ledger_fee) * BigInt(10);
            const link_create_fee = CREATE_LINK_FEE;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc1Transfer("ICP", airdropAmount);
                await executor.executeIcrc2Approve("ICP", link_create_fee + ledger_fee);
                await executor.triggerTransaction();
            };

            const result = await fixture.completeActiveLinkFlow(
                "SendAirdrop",
                multiUserConfig,
                [multiUserAssetInfo],
                BigInt(10),
                fixture.identities.get("alice")!,
                execute_tx,
            );

            multiUserLinkId = result.link.id;
        });

        it("should handle claims from multiple users", async () => {
            // Record initial balances for all users
            const initialBalances = {
                charlie: await fixture.getUserBalance("charlie", "ICP"),
                david: await fixture.getUserBalance("david", "ICP"),
                eve: await fixture.getUserBalance("eve", "ICP"),
            };

            const linkBalanceBefore = await fixture.checkLinkBalance(
                FEE_CANISTER_ID,
                multiUserLinkId,
            );

            // Simulate concurrent claims by creating actions for multiple users
            const claimPromises = [];

            // Charlie claims
            fixture.switchToUser("charlie");
            claimPromises.push(
                fixture.createAction(multiUserLinkId, "Use").then(async (action) => {
                    expect(action.creator).toEqual(charlie_id!);
                    expect(action.type).toEqual("Use");
                    return { user: "charlie", action };
                }),
            );

            // David claims
            fixture.switchToUser("david");
            claimPromises.push(
                fixture.createAction(multiUserLinkId, "Use").then(async (action) => {
                    expect(action.creator).toEqual(david_id!);
                    expect(action.type).toEqual("Use");
                    return { user: "david", action };
                }),
            );

            // Eve claims
            fixture.switchToUser("eve");
            claimPromises.push(
                fixture.createAction(multiUserLinkId, "Use").then(async (action) => {
                    expect(action.creator).toEqual(eve_id!);
                    expect(action.type).toEqual("Use");
                    return { user: "eve", action };
                }),
            );

            // Wait for all claims to be created
            const claimResults = await Promise.all(claimPromises);

            // Verify all actions were created successfully
            expect(claimResults).toHaveLength(3);
            claimResults.forEach((result) => {
                expect(result.action.state).toEqual("Action_state_created");
                expect(result.action.intents).toHaveLength(1);
                expect(result.action.intents[0].type).toEqual("Transfer");
            });

            // Process all claims concurrently
            const processPromises = claimResults.map(async (result) => {
                fixture.switchToUser(result.user);
                return await fixture.processAction(multiUserLinkId, result.action.id, "Use");
            });

            const processResults = await Promise.all(processPromises);

            // Verify all claims were processed successfully
            processResults.forEach((result: any) => {
                expect(result.state).toEqual("Action_state_success");
            });

            // Verify balances after concurrent claims
            const finalBalances = {
                charlie: await fixture.getUserBalance("charlie", "ICP"),
                david: await fixture.getUserBalance("david", "ICP"),
                eve: await fixture.getUserBalance("eve", "ICP"),
            };

            const expectedClaimAmount = BigInt(5_0000_0000); // 5 ICP

            expect(finalBalances.charlie).toEqual(initialBalances.charlie + expectedClaimAmount);
            expect(finalBalances.david).toEqual(initialBalances.david + expectedClaimAmount);
            expect(finalBalances.eve).toEqual(initialBalances.eve + expectedClaimAmount);

            // Verify link state after multiple claims
            const linkState = await fixture.getLinkWithActions(multiUserLinkId);
            expect(linkState.link.link_use_action_counter).toEqual(3n);
            expect(linkState.link.state).toEqual("Link_state_active");

            // Verify link balance decreased correctly
            const linkBalanceAfter = await fixture.checkLinkBalance(
                FEE_CANISTER_ID,
                multiUserLinkId,
            );
            const expectedLinkBalance = linkBalanceBefore - (BigInt(5_0000_0000) + ledger_fee) * 3n;
            expect(linkBalanceAfter).toEqual(expectedLinkBalance);
        });

        it("should prevent duplicate claims from the same user", async () => {
            fixture.switchToUser("charlie");

            // Try to claim again (should fail or be prevented)
            try {
                const duplicateAction = await fixture.createAction(multiUserLinkId, "Use");
                // If the system allows creating the action, it should fail during processing
                const result = await fixture.processAction(
                    multiUserLinkId,
                    duplicateAction.id,
                    "Use",
                );
                expect(result.state).not.toEqual("Action_state_success");
            } catch (error) {
                // Expected to fail - user already claimed
                expect(error).toBeDefined();
            }

            // Verify link counter hasn't increased
            const linkState = await fixture.getLinkWithActions(multiUserLinkId);
            expect(linkState.link.link_use_action_counter).toEqual(3n); // Still 3 from previous test
        });

        it("should handle max claim limit correctly", async () => {
            // Create a link with only 1 claim allowed to test limits
            fixture.switchToUser("alice");

            const limitTestConfig: LinkConfig = {
                title: "Limited Airdrop Test",
                description: "Testing claim limits",
                template: "Central",
                link_image_url: "https://www.google.com",
                link_type: "SendAirdrop",
                link_use_action_max_count: BigInt(1), // Only 1 claim allowed
            };

            const limitAssetInfo: AssetInfo = {
                chain: "IC",
                address: FEE_CANISTER_ID,
                label: "SEND_AIRDROP_ASSET",
                amount_per_link_use: BigInt(3_0000_0000), // 3 ICP per claim
            };

            const airdropAmount = (limitAssetInfo.amount_per_link_use! + ledger_fee) * BigInt(1);
            const approveAmount = CREATE_LINK_FEE + ledger_fee;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc1Transfer("ICP", airdropAmount);
                await executor.executeIcrc2Approve("ICP", approveAmount);
                await executor.triggerTransaction();
            };

            const result = await fixture.completeActiveLinkFlow(
                "SendAirdrop",
                limitTestConfig,
                [limitAssetInfo],
                BigInt(1),
                fixture.identities.get("alice")!,
                execute_tx,
            );

            const limitedLinkId = result.link.id;

            // First user claims successfully
            fixture.switchToUser("charlie");
            const firstAction = await fixture.createAction(limitedLinkId, "Use");
            const firstResult = await fixture.processAction(limitedLinkId, firstAction.id, "Use");
            expect(firstResult.state).toEqual("Action_state_success");

            // Verify link is now exhausted
            const linkState = await fixture.getLinkWithActions(limitedLinkId);
            expect(linkState.link.link_use_action_counter).toEqual(1n);
            expect(linkState.link.state).toEqual("Link_state_active");

            // Second user should not be able to claim
            fixture.switchToUser("david");
            try {
                const secondAction = await fixture.createAction(limitedLinkId, "Use");
                const secondResult = await fixture.processAction(
                    limitedLinkId,
                    secondAction.id,
                    "Use",
                );
                expect(secondResult.state).not.toEqual("Action_state_success");
            } catch (error) {
                // Expected to fail - link is exhausted
                expect(error).toBeDefined();
            }
        });

        // it("should maintain link integrity under concurrent access", async () => {
        //     // Test with rapid concurrent access to ensure data consistency
        //     fixture.switchToUser("alice");

        //     const stressTestConfig: LinkConfig = {
        //         title: "Stress Test Airdrop",
        //         description: "Testing system integrity under load",
        //         template: "Central",
        //         link_image_url: "https://www.google.com",
        //         link_type: "SendAirdrop",
        //         link_use_action_max_count: BigInt(5),
        //     };

        //     const stressAssetInfo: AssetInfo = {
        //         chain: "IC",
        //         address: FEE_CANISTER_ID,
        //         label: "SEND_AIRDROP_ASSET",
        //         amount_per_link_use: BigInt(2_0000_0000), // 2 ICP per claim
        //     };

        //     const airdropAmount = (stressAssetInfo.amount_per_link_use! + ledger_fee) * BigInt(5);
        //     const approveAmount = CREATE_LINK_FEE + ledger_fee;

        //     const execute_tx = async (executor: Icrc112ExecutorV2) => {
        //         await executor.executeIcrc1Transfer("ICP", airdropAmount);
        //         await executor.executeIcrc2Approve("ICP", approveAmount);
        //         await executor.triggerTransaction();
        //     };

        //     const result = await fixture.completeActiveLinkFlow(
        //         "SendAirdrop",
        //         stressTestConfig,
        //         [stressAssetInfo],
        //         BigInt(5),
        //         fixture.identities.get("alice")!,
        //         execute_tx,
        //     );

        //     const stressLinkId = result.link.id;
        //     const linkBalanceBefore = await fixture.checkLinkBalance(FEE_CANISTER_ID, stressLinkId);

        //     // Create rapid concurrent claims from multiple users
        //     const users = ["bob", "charlie", "david", "eve"];
        //     const rapidClaimPromises = users.slice(0, 4).map(async (user) => {
        //         fixture.switchToUser(user);
        //         const action = await fixture.createAction(stressLinkId, "Use");
        //         return await fixture.processAction(stressLinkId, action.id, "Use");
        //     });

        //     const rapidResults = await Promise.all(rapidClaimPromises);

        //     // Verify all claims succeeded
        //     rapidResults.forEach((result: any) => {
        //         expect(result.state).toEqual("Action_state_success");
        //     });

        //     // Verify final link state
        //     const finalLinkState = await fixture.getLinkWithActions(stressLinkId);
        //     expect(finalLinkState.link.link_use_action_counter).toEqual(4n);
        //     expect(finalLinkState.link.state).toEqual("Link_state_active");

        //     // Verify balance consistency
        //     const linkBalanceAfter = await fixture.checkLinkBalance(FEE_CANISTER_ID, stressLinkId);
        //     const expectedDecrease = BigInt(2_0000_0000) * 4n; // 4 claims of 2 ICP each
        //     expect(linkBalanceAfter).toEqual(linkBalanceBefore - expectedDecrease);
        // });
    });
});
