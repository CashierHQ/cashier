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

describe("Test create and claim tip link", () => {
    const fixture = new LinkTestFixture();
    let linkId: string;
    let claimActionId: string;

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
    let bob_id: string | null = null;

    beforeAll(async () => {
        await fixture.setup({});
        await fixture.airdropTokensToUsers(
            BigInt(100_0000_0000), // Airdrop 100 ICP to each user
            ["alice", "bob"], // Airdrop to Alice and Bob
        );
        alice_id = (await fixture.getUserDetails("alice")).id;
        bob_id = (await fixture.getUserDetails("bob")).id;
    });

    afterAll(async () => {
        await fixture.tearDown();
    });

    describe("With Alice", () => {
        beforeEach(async () => {
            fixture.switchToUser("alice");
        });

        it("should complete the full link creation process", async () => {
            const tipAmount = (assetInfo.amount_per_link_use! + ledger_fee) * max_use;
            const link_create_fee = CREATE_LINK_FEE;
            const balanceBefore = await fixture.getUserBalance("alice", "ICP");
            const treasury_balance_before = await fixture.getWalletBalance(TREASURY_WALLET, "ICP");
            const expected_treasury_balance = treasury_balance_before + CREATE_LINK_FEE;
            // Total amount used = tipAmount + ledger_fee (transfer tipAmount)  + ledger_fee (approve fee) + ledger_fee (transfer from)
            const expectedBalanceAfter =
                balanceBefore - tipAmount - CREATE_LINK_FEE - ledger_fee * 3n;

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
            expect(action.intents).toHaveLength(1);

            const intent = action.intents[0];
            expect(intent.type).toEqual("Transfer");
            expect(intent.chain).toEqual("IC");
            expect(intent.task).toEqual("transfer_link_to_wallet");
            expect(intent.state).toEqual("Intent_state_created");

            expect(intent.type_metadata).toHaveLength(4);
            expect(intent.type_metadata).toEqual(
                expect.arrayContaining([
                    [
                        "asset",
                        {
                            Asset: {
                                chain: "IC",
                                address: assetInfo.address,
                            },
                        },
                    ],
                    [
                        "amount",
                        {
                            U64: assetInfo.amount_per_link_use!,
                        },
                    ],
                    [
                        "to",
                        {
                            Wallet: {
                                chain: "IC",
                                address: fixture.identities.get("bob")!.getPrincipal().toText(),
                            },
                        },
                    ],
                    [
                        "from",
                        {
                            Wallet: {
                                chain: "IC",
                                address: expect.stringContaining(
                                    linkId.replace(/-/g, "") + "00000000000000000000000000000000",
                                ),
                            },
                        },
                    ],
                ]),
            );

            // Verify user state after creating claim
            const userState = await fixture.getUserState(linkId, "Use");
            if (!userState) {
                throw new Error("User state is undefined");
            }
            expect(userState.link_user_state).toEqual("User_state_choose_wallet");
            expect(userState.action.state).toEqual("Action_state_created");
        });

        it("should process claim successfully", async () => {
            const expected_link_balance_after = BigInt(0); // All funds should be claimed since max_use is 1
            const airdropAmount = (assetInfo.amount_per_link_use! + ledger_fee) * max_use;

            // Get initial balance
            const bobAccount = {
                owner: fixture.identities.get("bob")!.getPrincipal(),
                subaccount: [] as any,
            };
            const balanceBefore = await fixture.multiTokenHelper!.balanceOf("ICP", bobAccount);

            // Check link balance before claim
            const linkBalanceBefore = await fixture.checkLinkBalance(assetInfo.address, linkId);
            expect(linkBalanceBefore).toEqual(airdropAmount);

            // Process claim action
            const action = await fixture.confirmAction(linkId, claimActionId, "Use");
            expect(action.state).toEqual("Action_state_success");

            const intent = action.intents[0];
            expect(intent.state).toEqual("Intent_state_success");

            const transaction = intent.transactions[0];
            expect(transaction.state).toEqual("Transaction_state_success");

            // Verify balance after claim
            const balanceAfter = await fixture.multiTokenHelper!.balanceOf("ICP", bobAccount);
            const balanceChanged = balanceAfter - balanceBefore;
            expect(balanceChanged).toEqual(assetInfo.amount_per_link_use);

            // Check link balance after claim
            const linkBalanceAfter = await fixture.checkLinkBalance(assetInfo.address, linkId);
            expect(linkBalanceAfter).toEqual(expected_link_balance_after);

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
