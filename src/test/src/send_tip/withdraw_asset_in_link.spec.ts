// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

/* eslint-disable @typescript-eslint/no-explicit-any */
import { LinkTestFixture, LinkConfig, AssetInfo } from "../../fixtures/link-test-fixture";
import { IntentDto } from "../../../declarations/cashier_backend/cashier_backend.did";
import { fromNullable, toNullable } from "@dfinity/utils";
import { CREATE_LINK_FEE, FEE_CANISTER_ID, TREASURY_WALLET } from "../../constant";
import { Icrc112ExecutorV2 } from "../../utils/icrc-112-v2";
import { safeParseJSON } from "../../utils/parser";

describe("Test withdraw for send tip link", () => {
    const fixture = new LinkTestFixture();
    let linkId: string;

    // Common test configuration
    const testConfig: LinkConfig = {
        title: "tip 10 icp",
        description: "tip 10 icp to the user",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "SendTip",
        link_use_action_max_count: BigInt(1),
    };

    const assetInfo: AssetInfo = {
        chain: "IC",
        address: FEE_CANISTER_ID,
        label: "SEND_TIP_ASSET",
        amount_per_link_use: BigInt(10_0000_0000),
    };

    const ledger_fee = BigInt(10_000);
    const max_use = BigInt(1);

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

    describe("Create link and withdraw unclaimed amount", () => {
        beforeEach(async () => {
            fixture.switchToUser("alice");
        });

        it("should complete the full link creation process", async () => {
            const tipAmount = (assetInfo.amount_per_link_use! + ledger_fee) * max_use;
            const link_create_fee = CREATE_LINK_FEE;
            const balanceBefore = await fixture.getUserBalance("alice", "ICP");
            const treasury_balance_before = await fixture.getWalletBalance(TREASURY_WALLET, "ICP");
            const expected_treasury_balance = treasury_balance_before + CREATE_LINK_FEE;
            // Total amount used = tipAmount + ledger_fee (transfer tipAmount) + CREATE_LINK_FEE
            const expectedBalanceAfter =
                balanceBefore - tipAmount - ledger_fee - CREATE_LINK_FEE - ledger_fee * 2n;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc1Transfer("ICP", tipAmount);
                await executor.executeIcrc2Approve("ICP", link_create_fee + ledger_fee);
                await executor.triggerTransaction();
            };

            // Create and set up the link using the fixture's helper method
            const result = await fixture.completeActiveLinkFlow(
                "SendTip",
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
            expect(linkResp.link.link_type).toEqual(toNullable("SendTip"));
            expect(linkResp.link.creator).toEqual(alice_id);

            const linkBalance = await fixture.checkLinkBalance(assetInfo.address, linkId);
            expect(linkBalance).toEqual(tipAmount);

            // Verify action successful
            const action = fromNullable(linkResp.action);
            expect(action).toBeDefined();
            expect(action!.state).toEqual("Action_state_success");
            action!.intents.forEach((intent: IntentDto) => {
                expect(intent.state).toEqual("Intent_state_success");
            });
            expect(action!.type).toEqual("CreateLink");
            expect(action!.creator).toEqual(alice_id);

            // Verify user balance after link creation
            const balanceAfter = await fixture.getUserBalance("alice", "ICP");
            expect(balanceAfter).toEqual(expectedBalanceAfter);

            // Verify treasury balance after link creation
            const treasury_balance_after = await fixture.getWalletBalance(TREASURY_WALLET, "ICP");
            expect(treasury_balance_after).toEqual(expected_treasury_balance);
        });
    });

    it("should be able to withdraw unclaimed tip amount", async () => {
        const inactive_link = await fixture.inactiveLink(linkId);
        const linkBalanceBefore = await fixture.checkLinkBalance(assetInfo.address, linkId);
        const creatorBalanceBefore = await fixture.getUserBalance("alice", "ICP");

        expect(inactive_link.state).toEqual("Link_state_inactive");

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
