// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

/* eslint-disable @typescript-eslint/no-explicit-any */
import { LinkTestFixture, LinkConfig, AssetInfo } from "../fixtures/link-test-fixture";
import { IntentDto } from "../../../declarations/cashier_backend/cashier_backend.did";
import { fromNullable, toNullable } from "@dfinity/utils";
import { CREATE_LINK_FEE, FEE_CANISTER_ID, TREASURY_WALLET } from "../constant";
import { Icrc112ExecutorV2 } from "../utils/icrc-112-v2";
import { safeParseJSON } from "../utils/parser";

describe("Test withdraw for receive payment link", () => {
    const fixture = new LinkTestFixture();
    let linkId: string;
    let useActionId: string;

    // Common test configuration
    const testConfig: LinkConfig = {
        title: "Request 5 ICP payment",
        description: "Pay 5 ICP to this link",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "ReceivePayment",
        link_use_action_max_count: BigInt(1),
    };

    const assetInfo: AssetInfo = {
        chain: "IC",
        address: FEE_CANISTER_ID,
        label: "RECEIVE_PAYMENT_ASSET",
        amount_per_link_use: BigInt(5_0000_0000), // 5 ICP
    };

    const ledger_fee = BigInt(10_000);

    let alice_id: string | null = null;

    beforeAll(async () => {
        await fixture.setup({});
        await fixture.airdropTokensToUsers(
            BigInt(100_0000_0000), // Airdrop 100 ICP to each user
            ["alice", "bob"], // Airdrop to Alice and Bob
        );
        alice_id = (await fixture.getUserDetails("alice")).id;
    });

    afterAll(async () => {
        await fixture.tearDown();
    });

    describe("Create link, receive payment, and withdraw", () => {
        beforeEach(async () => {
            fixture.switchToUser("alice");
        });

        it("should complete the full receive payment link creation process", async () => {
            const transfer_amount = CREATE_LINK_FEE;
            const balanceBefore = await fixture.getUserBalance("alice", "ICP");
            const treasury_balance_before = await fixture.getWalletBalance(TREASURY_WALLET, "ICP");
            const expected_treasury_balance = treasury_balance_before + CREATE_LINK_FEE;

            // For receive payment links, only fee is charged during creation (no asset transfer)
            // Total amount used = approveAmount + ledger_fee
            const expectedBalanceAfter = balanceBefore - transfer_amount - ledger_fee * 2n;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                // Only approve fee payment, no asset transfer for receive payment links
                await executor.executeIcrc2Approve("ICP", transfer_amount + ledger_fee);
                await executor.triggerTransaction();
            };

            // Create and set up the link using the fixture's helper method
            const result = await fixture.completeActiveLinkFlow(
                "ReceivePayment",
                testConfig,
                [assetInfo],
                BigInt(1),
                fixture.identities.get("alice")!,
                execute_tx,
            );

            linkId = result.link.id;

            // Verify link is active
            const linkResp = await fixture.getLinkWithActions(linkId, "CreateLink");
            expect(linkResp.link.state).toEqual("Link_state_active");
            expect(linkResp.link.link_use_action_counter).toEqual(0n);
            expect(linkResp.link.link_use_action_max_count).toEqual(BigInt(1));
            expect(linkResp.link.link_type).toEqual(toNullable("ReceivePayment"));
            expect(linkResp.link.creator).toEqual(alice_id);

            // For receive payment links, the link vault should be empty initially
            const linkBalance = await fixture.checkLinkBalance(assetInfo.address, linkId);
            expect(linkBalance).toEqual(0n);

            // Verify action successful
            const action = fromNullable(linkResp.action);
            expect(action).toBeDefined();
            expect(action!.state).toEqual("Action_state_success");
            action!.intents.forEach((intent: IntentDto) => {
                expect(intent.state).toEqual("Intent_state_success");
            });
            expect(action!.type).toEqual("CreateLink");
            expect(action!.creator).toEqual(alice_id);

            // Verify user balance after link creation (only fee deducted)
            const balanceAfter = await fixture.getUserBalance("alice", "ICP");
            expect(balanceAfter).toEqual(expectedBalanceAfter);

            // Verify treasury balance after link creation
            const treasury_balance_after = await fixture.getWalletBalance(TREASURY_WALLET, "ICP");
            expect(treasury_balance_after).toEqual(expected_treasury_balance);
        });

        it("should receive payment from Bob", async () => {
            // Switch to Bob to make the payment
            fixture.switchToUser("bob");

            const bobBalanceBefore = await fixture.getUserBalance("bob", "ICP");

            // Create use action for payment
            const action = await fixture.createAction(linkId, "Use");
            expect(action).toBeTruthy();
            useActionId = action.id;

            // Process the payment
            const processedAction = await fixture.processAction(linkId, useActionId, "Use");

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                // Only approve fee payment, no asset transfer for receive payment links
                await executor.executeIcrc1Transfer("ICP", assetInfo.amount_per_link_use!);
            };
            await fixture.executeIcrc112Requests(
                fromNullable(processedAction.icrc_112_requests) || [],
                linkId,
                useActionId,
                fixture.identities.get("bob")!,
                execute_tx,
            );
            const afterConfirmedAction = await fixture.postIcrc112Requests(linkId, useActionId);

            expect(afterConfirmedAction.state).toEqual("Action_state_success");

            // Verify payment was received by the link
            const linkBalance = await fixture.checkLinkBalance(assetInfo.address, linkId);
            expect(linkBalance).toEqual(assetInfo.amount_per_link_use);

            // Verify Bob's balance decreased
            const bobBalanceAfter = await fixture.getUserBalance("bob", "ICP");
            expect(bobBalanceAfter).toEqual(
                bobBalanceBefore - assetInfo.amount_per_link_use! - ledger_fee,
            );

            // Verify link counter increased
            const linkState = await fixture.getLinkWithActions(linkId);
            expect(linkState.link.link_use_action_counter).toEqual(1n);
        });
    });

    it("should be able to withdraw received payment", async () => {
        // Switch back to Alice (creator) to withdraw
        fixture.switchToUser("alice");

        const inactive_link = await fixture.inactiveLink(linkId);
        const linkBalanceBefore = await fixture.checkLinkBalance(assetInfo.address, linkId);
        const creatorBalanceBefore = await fixture.getUserBalance("alice", "ICP");

        expect(inactive_link.state).toEqual("Link_state_inactive");
        expect(linkBalanceBefore).toEqual(assetInfo.amount_per_link_use); // Should have the payment amount

        const action = await fixture.createAction(linkId, "Withdraw");
        expect(action.state).toEqual("Action_state_created");

        const processedAction = await fixture.processAction(linkId, action.id, "Withdraw");

        console.log("processedAction", safeParseJSON(processedAction as any));

        const linkBalanceAfter = await fixture.checkLinkBalance(assetInfo.address, linkId);
        const creatorBalanceAfter = await fixture.getUserBalance("alice", "ICP");

        expect(processedAction.state).toEqual("Action_state_success");
        processedAction.intents.forEach((intent: IntentDto) => {
            expect(intent.state).toEqual("Intent_state_success");
        });
        expect(linkBalanceAfter).toEqual(0n);
        expect(creatorBalanceAfter).toEqual(creatorBalanceBefore + linkBalanceBefore - ledger_fee);
    });
});
