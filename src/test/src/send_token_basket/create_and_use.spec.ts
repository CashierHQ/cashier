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
import { CREATE_LINK_FEE, TREASURY_WALLET } from "../../constant";
import { Icrc112ExecutorV2 } from "../../utils/icrc-112-v2";

describe("Test create and claim token basket link", () => {
    const fixture = new LinkTestFixture();
    let linkId: string;
    let claimActionId: string;

    // Common test configuration
    const testConfig: LinkConfig = {
        title: "send token basket",
        description: "Send a basket of tokens",
        template: "Central",
        link_image_url: "https://www.google.com",
        link_type: "SendTokenBasket",
        link_use_action_max_count: BigInt(1),
    };

    const ledger_fee = BigInt(10_000);
    const max_use = BigInt(1);

    let alice_id: string | null = null;
    let bob_id: string | null = null;

    let assets: (AssetInfo & {
        tokenIndex: string;
    })[] = [];

    beforeAll(async () => {
        await fixture.setup({});

        await fixture.airdropTokensToUsers(
            BigInt(1000_0000_0000), // Airdrop large amount for multiple tokens
            ["alice", "bob"], // Airdrop to Alice and Bob
        );

        alice_id = (await fixture.getUserDetails("alice")).id;
        bob_id = (await fixture.getUserDetails("bob")).id;

        const multiple_token_helper = fixture.multiTokenHelper!;
        assets = [
            {
                chain: "IC",
                address: multiple_token_helper.getTokenCanisterId("token1").toString(),
                label:
                    "SEND_TOKEN_BASKET_ASSET" +
                    "_" +
                    multiple_token_helper.getTokenCanisterId("token1").toString(),
                amount_per_link_use: BigInt(10_0000_0000),
                tokenIndex: "token1",
            },
            {
                chain: "IC",
                address: multiple_token_helper.getTokenCanisterId("token2").toString(),
                label:
                    "SEND_TOKEN_BASKET_ASSET" +
                    "_" +
                    multiple_token_helper.getTokenCanisterId("token2").toString(),
                amount_per_link_use: BigInt(20_0000_0000),
                tokenIndex: "token2",
            },
            {
                chain: "IC",
                address: multiple_token_helper.getTokenCanisterId("token3").toString(),
                label:
                    "SEND_TOKEN_BASKET_ASSET" +
                    "_" +
                    multiple_token_helper.getTokenCanisterId("token3").toString(),
                amount_per_link_use: BigInt(30_0000_0000),
                tokenIndex: "token3",
            },
        ];
    });

    afterAll(async () => {
        await fixture.tearDown();
    });

    describe("With Alice", () => {
        beforeEach(async () => {
            fixture.switchToUser("alice");
        });

        it("should complete the full link creation process", async () => {
            const link_create_fee = CREATE_LINK_FEE;
            const balancesBefore = new Map<string, bigint>();
            const treasury_balance_before = await fixture.getWalletBalance(TREASURY_WALLET, "ICP");
            const expected_treasury_balance = treasury_balance_before + CREATE_LINK_FEE;

            // Get initial balances for all tokens
            for (const asset of assets) {
                const balance = await fixture.getUserBalance("alice", asset.tokenIndex);
                balancesBefore.set(asset.tokenIndex, balance);
            }

            // Get initial ICP balance for Alice
            const icpBalanceBefore = await fixture.getUserBalance("alice", "ICP");
            console.log("Alice ICP balance before", icpBalanceBefore);

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                // Transfer each token to the link
                for (const asset of assets) {
                    const transferAmount = (asset.amount_per_link_use! + ledger_fee) * max_use;
                    await executor.executeIcrc1Transfer(asset.tokenIndex, transferAmount);
                }
                // Approve fee payment
                await executor.executeIcrc2Approve("ICP", link_create_fee + ledger_fee);
                await executor.triggerTransaction();
            };

            // Create and set up the link using the fixture's helper method
            const result = await fixture.completeActiveLinkFlow(
                "SendTokenBasket",
                testConfig,
                assets,
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
            expect(linkResp.link.link_type).toEqual(toNullable("SendTokenBasket"));
            expect(linkResp.link.creator).toEqual(alice_id);

            // Verify link balances for each asset
            for (const asset of assets) {
                const linkBalance = await fixture.checkLinkBalance(asset.address, linkId);
                const expectedLinkBalance = (asset.amount_per_link_use! + ledger_fee) * max_use;
                expect(linkBalance).toEqual(expectedLinkBalance);
            }

            // Verify action successful
            const action = fromNullable(linkResp.action);
            expect(action).toBeDefined();
            expect(action!.state).toEqual("Action_state_success");
            action!.intents.forEach((intent: IntentDto) => {
                expect(intent.state).toEqual("Intent_state_success");
            });
            expect(action!.type).toEqual("CreateLink");
            expect(action!.creator).toEqual(alice_id);

            // Verify user balances after link creation
            for (const asset of assets) {
                const balanceBefore = balancesBefore.get(asset.tokenIndex) || BigInt(0);
                const balanceAfter = await fixture.getUserBalance("alice", asset.tokenIndex);
                const transferAmount = (asset.amount_per_link_use! + ledger_fee) * max_use;
                const ledgerFee = await fixture.getTokenFee(asset.tokenIndex);
                const expectedBalanceAfter = balanceBefore - transferAmount - ledgerFee;
                expect(balanceAfter).toEqual(expectedBalanceAfter);
            }

            // Verify Alice's ICP balance after paying fees
            const icpBalanceAfter = await fixture.getUserBalance("alice", "ICP");
            const icpLedgerFee = await fixture.getTokenFee("ICP");
            // Total ICP cost = ledger_fee (approve) + ledger_fee (transfer_from) + CREATE_LINK_FEE
            const expectedIcpBalanceAfter = icpBalanceBefore - icpLedgerFee * 2n - CREATE_LINK_FEE;
            console.log("Alice ICP balance after", icpBalanceAfter);
            console.log("Expected ICP balance after", expectedIcpBalanceAfter);
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

        it("should create use action", async () => {
            const action = await fixture.createAction(linkId, "Use");
            expect(action).toBeTruthy();

            claimActionId = action.id;
            expect(action.type).toEqual("Use");
            expect(action.state).toEqual("Action_state_created");
            expect(action.creator).toEqual(bob_id);
            expect(action.intents).toHaveLength(3);

            const intent = action.intents;
            for (const i of intent) {
                expect(i.state).toEqual("Intent_state_created");
                expect(i.chain).toEqual("IC");
                expect(i.task).toEqual("transfer_link_to_wallet");
                expect(i.type).toEqual("Transfer");
            }

            // Verify user state after creating claim
            const userState = await fixture.getUserState(linkId, "Use");
            if (!userState) {
                throw new Error("User state is undefined");
            }
            expect(userState.link_user_state).toEqual("User_state_choose_wallet");
            expect(userState.action.state).toEqual("Action_state_created");
        });

        it("should process claim successfully", async () => {
            // Get initial balance for each token
            const bobAccount = {
                owner: fixture.identities.get("bob")!.getPrincipal(),
                subaccount: [] as any,
            };

            const balanceBeforeMap = new Map<string, bigint>();
            for (const asset of assets) {
                const balanceBefore = await fixture.multiTokenHelper!.balanceOf(
                    asset.tokenIndex,
                    bobAccount,
                );
                balanceBeforeMap.set(asset.tokenIndex, balanceBefore);
            }

            // Check link balances before claim
            for (const asset of assets) {
                const linkBalanceBefore = await fixture.checkLinkBalance(asset.address, linkId);
                const expectedLinkBalance = (asset.amount_per_link_use! + ledger_fee) * max_use;
                expect(linkBalanceBefore).toEqual(expectedLinkBalance);
            }

            // Process claim action
            const action = await fixture.confirmAction(linkId, claimActionId, "Use");
            expect(action.state).toEqual("Action_state_success");

            const intent = action.intents[0];
            expect(intent.state).toEqual("Intent_state_success");

            // Verify balance after claim for each token
            for (const asset of assets) {
                const balanceBefore = balanceBeforeMap.get(asset.tokenIndex) || BigInt(0);
                const balanceAfter = await fixture.multiTokenHelper!.balanceOf(
                    asset.tokenIndex,
                    bobAccount,
                );
                const balanceChanged = balanceAfter - balanceBefore;
                expect(balanceChanged).toEqual(asset.amount_per_link_use!);
            }

            // Check link balances after claim (should be zero since max_use is 1)
            for (const asset of assets) {
                const linkBalanceAfter = await fixture.checkLinkBalance(asset.address, linkId);
                expect(linkBalanceAfter).toEqual(BigInt(0));
            }

            // Verify link state
            const linkState = await fixture.getLinkWithActions(linkId);
            expect(linkState.link.link_use_action_counter).toEqual(1n);
        });

        it("should complete the claim process", async () => {
            const result = await fixture.updateUserState(linkId, "Use", "Continue");
            expect(result[0].link_user_state).toEqual("User_state_completed_link");
        });
    });
});
