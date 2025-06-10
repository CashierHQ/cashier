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
import { safeParseJSON } from "../../utils/parser";

describe("Test withdraw", () => {
    const fixture = new LinkTestFixture();
    let linkId: string;

    // Common test configuration
    const testConfig: LinkConfig = {
        title: "airdrop 10 icp",
        description: "airdrop 10 icp to 5 users",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "SendAirdrop",
        link_use_action_max_count: BigInt(5),
    };

    const assetInfo: AssetInfo = {
        chain: "IC",
        address: FEE_CANISTER_ID,
        label: "SEND_AIRDROP_ASSET",
        amount_per_link_use: BigInt(10_0000_0000),
    };

    const ledger_fee = BigInt(10_000);
    const max_use = BigInt(5);

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

    describe("Create link and claim unclaimed amount", () => {
        beforeEach(async () => {
            fixture.switchToUser("alice");
        });

        it("should complete the full link creation process", async () => {
            const airdropAmount = (assetInfo.amount_per_link_use! + ledger_fee) * max_use;
            const link_create_fee = CREATE_LINK_FEE;
            const balanceBefore = await fixture.getUserBalance("alice", "ICP");
            const treasury_balance_before = await fixture.getWalletBalance(TREASURY_WALLET, "ICP");
            const expected_treasury_balance = treasury_balance_before + CREATE_LINK_FEE;
            console.log("airdropAmount", airdropAmount);
            // Total amount used = airdropAmount + ledger_fee (transfer airdropAmount) + ledger_fee (approve fee) + ledger_fee (transfer from) + CREATE_LINK_FEE
            const expectedBalanceAfter =
                balanceBefore - airdropAmount - ledger_fee * 3n - CREATE_LINK_FEE;
            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc1Transfer("ICP", airdropAmount);
                await executor.executeIcrc2Approve("ICP", link_create_fee + ledger_fee);
                await executor.triggerTransaction();
            };

            // Create and set up the link using the fixture's helper method
            const result = await fixture.completeActiveLinkFlow(
                "SendAirdrop",
                testConfig,
                [assetInfo],
                BigInt(5),
                fixture.identities.get("alice")!,
                execute_tx,
            );

            linkId = result.link.id;

            // Verify link is active
            const linkResp = await fixture.getLinkWithActions(linkId, "CreateLink");
            expect(linkResp.link.state).toEqual("Link_state_active");
            expect(linkResp.link.link_use_action_counter).toEqual(0n);
            expect(linkResp.link.link_use_action_max_count).toEqual(BigInt(5));
            expect(linkResp.link.link_type).toEqual(toNullable("SendAirdrop"));
            expect(linkResp.link.creator).toEqual(alice_id);

            const linkBalance = await fixture.checkLinkBalance(assetInfo.address, linkId);
            expect(linkBalance).toEqual(airdropAmount);

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

    it("should able to withdraw unclaimed amount", async () => {
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
