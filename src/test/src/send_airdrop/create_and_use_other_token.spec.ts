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
import { CREATE_LINK_FEE, TREASURY_WALLET } from "../../constant";
import { fromNullable, toNullable } from "@dfinity/utils";
import { IntentDto } from "../../../declarations/cashier_backend/cashier_backend.did";
import { Icrc112ExecutorV2 } from "../../utils/icrc-112-v2";

describe("Test create and claim token1 airdrop link", () => {
    const fixture = new LinkTestFixture();
    let linkId: string;
    let claimActionId: string;

    // Common test configuration
    const testConfig: LinkConfig = {
        title: "airdrop 10 token1",
        description: "airdrop 10 token1 to 5 users",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "SendAirdrop",
        link_use_action_max_count: BigInt(5),
    };

    const max_use = BigInt(5);

    let alice_id: string | null = null;
    let bob_id: string | null = null;
    let token1Address: string;
    let assetInfo: AssetInfo;
    let ledger_fee: bigint;

    beforeAll(async () => {
        await fixture.setup({});
        await fixture.airdropTokensToUsers(
            BigInt(1000_0000_0000), // Airdrop large amount for multiple tokens
            ["alice", "bob"], // Airdrop to Alice and Bob
        );

        alice_id = (await fixture.getUserDetails("alice")).id;
        bob_id = (await fixture.getUserDetails("bob")).id;

        // Get token1 address using the multiTokenHelper pattern
        const multiple_token_helper = fixture.multiTokenHelper!;
        token1Address = multiple_token_helper.getTokenCanisterId("token1").toString();
        ledger_fee = await fixture.getTokenFee("token1");

        // Define asset info for token1 using the token basket pattern
        assetInfo = {
            chain: "IC",
            address: token1Address,
            label: "SEND_AIRDROP_ASSET",
            amount_per_link_use: BigInt(10_0000_0000),
        };
    });

    afterAll(async () => {
        await fixture.tearDown();
    });

    describe("With Alice", () => {
        beforeEach(async () => {
            fixture.switchToUser("alice");
        });

        it("should complete the full link creation process with token1", async () => {
            const airdropAmount = (assetInfo.amount_per_link_use! + ledger_fee) * max_use;
            const approveAmount = CREATE_LINK_FEE + (await fixture.getTokenFee("ICP"));
            const balanceBefore = await fixture.getUserBalance("alice", "token1");
            const icpBalanceBefore = await fixture.getUserBalance("alice", "ICP");
            console.log("token1 balanceBefore", balanceBefore);
            console.log("ICP balanceBefore", icpBalanceBefore);

            const treasury_balance_before = await fixture.getWalletBalance(TREASURY_WALLET, "ICP");
            const expected_treasury_balance = treasury_balance_before + CREATE_LINK_FEE;

            console.log("airdropAmount", airdropAmount);

            // Total token1 amount used = airdropAmount + ledger_fee (transfer airdropAmount)
            const expectedToken1BalanceAfter = balanceBefore - airdropAmount - ledger_fee;

            // ICP cost = ledger_fee (approve fee) + CREATE_LINK_FEE + ledger_fee (transfer fee)
            const icpLedgerFee = await fixture.getTokenFee("ICP");
            const expectedIcpBalanceAfter = icpBalanceBefore - CREATE_LINK_FEE - icpLedgerFee * 2n;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                await executor.executeIcrc1Transfer("token1", airdropAmount);
                await executor.executeIcrc2Approve("ICP", approveAmount);
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

            // Verify user token1 balance after link creation
            const token1BalanceAfter = await fixture.getUserBalance("alice", "token1");
            expect(token1BalanceAfter).toEqual(expectedToken1BalanceAfter);

            // Verify user ICP balance after paying fees
            const icpBalanceAfter = await fixture.getUserBalance("alice", "ICP");
            expect(icpBalanceAfter).toEqual(expectedIcpBalanceAfter);

            // Verify treasury balance after link creation
            const treasury_balance_after = await fixture.getWalletBalance(TREASURY_WALLET, "ICP");
            expect(treasury_balance_after).toEqual(expected_treasury_balance);
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

        it("should create use action for token1 airdrop", async () => {
            const action = await fixture.createAction(linkId, "Use");
            console.log("linkId:", linkId);
            expect(action).toBeTruthy();

            claimActionId = action.id;
            expect(action.type).toEqual("Use");
            expect(action.state).toEqual("Action_state_created");
            expect(action.creator).toEqual(bob_id);
            expect(action.intents).toHaveLength(1);

            const intent = action.intents[0];
            expect(intent.type).toEqual("Transfer");
            expect(intent.chain).toEqual("IC");
            expect(intent.task).toEqual("transfer_link_to_wallet");
            expect(intent.state).toEqual("Intent_state_created");

            expect(intent.type_metadata).toHaveLength(4);
        });

        it("should process token1 claim successfully", async () => {
            const balanceBefore = await fixture.getUserBalance("bob", "token1");
            console.log("Bob token1 balance before claim:", balanceBefore);

            const linkBalanceBefore = await fixture.checkLinkBalance(token1Address, linkId);
            console.log("Link token1 balance before claim:", linkBalanceBefore);

            const processResult = await fixture.processAction(linkId, claimActionId, "Use");
            expect(processResult.state).toEqual("Action_state_success");

            // Verify link counter increased
            const linkAfterClaim = await fixture.getLinkWithActions(linkId);
            expect(linkAfterClaim.link.link_use_action_counter).toEqual(1n);

            // Verify Bob received the tokens
            const balanceAfter = await fixture.getUserBalance("bob", "token1");
            const expectedBalance = balanceBefore + assetInfo.amount_per_link_use!;
            expect(balanceAfter).toEqual(expectedBalance);
            console.log("Bob token1 balance after claim:", balanceAfter);

            // Verify link balance decreased
            const linkBalanceAfter = await fixture.checkLinkBalance(token1Address, linkId);
            const expectedLinkBalance =
                linkBalanceBefore - assetInfo.amount_per_link_use! - ledger_fee;
            expect(linkBalanceAfter).toEqual(expectedLinkBalance);
            console.log("Link token1 balance after claim:", linkBalanceAfter);
        });
    });
});
