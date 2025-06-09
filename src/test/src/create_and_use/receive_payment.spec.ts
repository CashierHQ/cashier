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

describe("Test create and use receive payment link", () => {
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

    describe("With Alice (Link Creator)", () => {
        beforeEach(async () => {
            fixture.switchToUser("alice");
        });

        it("should complete the full receive payment link creation process", async () => {
            const approveAmount = CREATE_LINK_FEE + ledger_fee * 2n;
            const balanceBefore = await fixture.getUserBalance("alice", "ICP");
            const treasury_balance_before = await fixture.getWalletBalance(TREASURY_WALLET, "ICP");
            const expected_treasury_balance = treasury_balance_before + CREATE_LINK_FEE;

            // For receive payment links, only fee is charged during creation (no asset transfer)
            // after total amount used
            // 1. CREATE_LINK_FEE + ledger_fee
            // 2. approve_fee == ledger_fee
            // Total amount used = approveAmount + ledger_fee
            const expectedBalanceAfter = balanceBefore - approveAmount;

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                // Only approve fee payment, no asset transfer for receive payment links
                await executor.executeIcrc2Approve("ICP", approveAmount);
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
    });

    describe("With Bob (Payer)", () => {
        beforeAll(async () => {
            fixture.switchToUser("bob");
        });

        it("should retrieve empty user state initially", async () => {
            const userState = await fixture.getUserState(linkId, "Use");
            expect(userState).toEqual(undefined);
        });

        it("should create use action for payment", async () => {
            const action = await fixture.createAction(linkId, "Use");
            expect(action).toBeTruthy();

            useActionId = action.id;
            expect(action.type).toEqual("Use");
            expect(action.state).toEqual("Action_state_created");
            expect(action.creator).toEqual(bob_id);
            expect(action.intents).toHaveLength(1);

            const intent = action.intents[0];
            expect(intent.type).toEqual("Transfer");
            expect(intent.chain).toEqual("IC");
            expect(intent.task).toEqual("transfer_wallet_to_link");
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
                        "from",
                        {
                            Wallet: {
                                chain: "IC",
                                address: fixture.identities.get("bob")!.getPrincipal().toText(),
                            },
                        },
                    ],
                    [
                        "to",
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

            expect(intent.transactions).toHaveLength(1);

            console.log("Intent created:", safeParseJSON(intent as any));

            const transaction = intent.transactions[0];
            expect(transaction.protocol).toEqual("Icrc1Transfer");
            expect(transaction.from_call_type).toEqual("Wallet");
            expect(transaction.state).toEqual("Transaction_state_created");
            expect(transaction.dependency).toEqual([]);
            expect(transaction.group).toEqual(1);
            expect(transaction.id).toBeDefined();
            expect(transaction.created_at).toBeDefined();

            // Check protocol_metadata structure
            expect(transaction.protocol_metadata).toHaveLength(5);

            // Convert transaction ID to bytes for memo validation
            const transactionIdBytes =
                transaction.id
                    .replace(/-/g, "")
                    .match(/.{2}/g)
                    ?.map((hex: string) => parseInt(hex, 16)) || [];
            expect(transaction.protocol_metadata).toEqual(
                expect.arrayContaining([
                    [
                        "amount",
                        {
                            U64: assetInfo.amount_per_link_use!,
                        },
                    ],
                    [
                        "memo",
                        {
                            MaybeMemo: [
                                expect.objectContaining({
                                    "0": transactionIdBytes[0],
                                    "1": transactionIdBytes[1],
                                    "2": transactionIdBytes[2],
                                    "3": transactionIdBytes[3],
                                    "4": transactionIdBytes[4],
                                    "5": transactionIdBytes[5],
                                    "6": transactionIdBytes[6],
                                    "7": transactionIdBytes[7],
                                    "8": transactionIdBytes[8],
                                    "9": transactionIdBytes[9],
                                    "10": transactionIdBytes[10],
                                    "11": transactionIdBytes[11],
                                    "12": transactionIdBytes[12],
                                    "13": transactionIdBytes[13],
                                    "14": transactionIdBytes[14],
                                    "15": transactionIdBytes[15],
                                    "16": 0,
                                    "17": 0,
                                    "18": 0,
                                    "19": 0,
                                    "20": 0,
                                    "21": 0,
                                    "22": 0,
                                    "23": 0,
                                    "24": 0,
                                    "25": 0,
                                    "26": 0,
                                    "27": 0,
                                    "28": 0,
                                    "29": 0,
                                    "30": 0,
                                    "31": 0,
                                }),
                            ],
                        },
                    ],
                    [
                        "from",
                        {
                            Wallet: {
                                chain: "IC",
                                address: fixture.identities.get("bob")!.getPrincipal().toText(),
                            },
                        },
                    ],
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
                        "to",
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

            // Verify user state after creating payment action
            const userState = await fixture.getUserState(linkId, "Use");
            if (!userState) {
                throw new Error("User state is undefined");
            }
            expect(userState.link_user_state).toEqual("User_state_choose_wallet");
            expect(userState.action.state).toEqual("Action_state_created");
        });

        it("should process payment successfully", async () => {
            // Get initial balances
            const bobAccount = {
                owner: fixture.identities.get("bob")!.getPrincipal(),
                subaccount: [] as any,
            };
            const balanceBefore = await fixture.multiTokenHelper!.balanceOf("ICP", bobAccount);

            // Check link balance before payment (should be empty)
            const linkBalanceBefore = await fixture.checkLinkBalance(assetInfo.address, linkId);
            expect(linkBalanceBefore).toEqual(0n);

            const confirmRes = await fixture.confirmAction(linkId, useActionId, "Use");
            expect(confirmRes.state).toEqual("Action_state_processing");

            const intent = confirmRes.intents[0];
            expect(intent.state).toEqual("Intent_state_processing");

            const transaction = intent.transactions[0];
            expect(transaction.state).toEqual("Transaction_state_processing");

            const icrc_112_requests = confirmRes.icrc_112_requests;
            expect(icrc_112_requests).toHaveLength(1);
            expect(icrc_112_requests[0]).toHaveLength(1);
            expect(icrc_112_requests[0]![0]).toHaveLength(1);
            expect(icrc_112_requests[0]![0]![0]).toEqual(
                expect.objectContaining({
                    method: "icrc1_transfer",
                    canister_id: "ryjl3-tyaaa-aaaaa-aaaba-cai",
                    nonce: ["c7c975f9-1689-47f8-8b13-a2379c255c8f"],
                    // arg is ignored by not including it
                }),
            );

            const execute_tx = async (executor: Icrc112ExecutorV2) => {
                // Only approve fee payment, no asset transfer for receive payment links
                await executor.executeIcrc1Transfer("ICP", assetInfo.amount_per_link_use!);
            };

            await fixture.executeIcrc112Requests(
                fromNullable(icrc_112_requests)!,
                linkId,
                useActionId,
                fixture.identities.get("bob")!,
                execute_tx,
            );

            const afterConfirmedAction = await fixture.postIcrc112Requests(linkId, useActionId);
            expect(afterConfirmedAction.state).toEqual("Action_state_success");
            expect(afterConfirmedAction.intents[0].state).toEqual("Intent_state_success");
            expect(afterConfirmedAction.intents[0].transactions[0].state).toEqual(
                "Transaction_state_success",
            );

            // Verify balance after payment
            const balanceAfter = await fixture.multiTokenHelper!.balanceOf("ICP", bobAccount);
            const balanceChanged = balanceBefore - balanceAfter;
            // Payment amount + ledger fee
            expect(balanceChanged).toEqual(assetInfo.amount_per_link_use! + ledger_fee);

            // Check link balance after payment (should contain the payment)
            const linkBalanceAfter = await fixture.checkLinkBalance(assetInfo.address, linkId);
            expect(linkBalanceAfter).toEqual(assetInfo.amount_per_link_use!);

            // Verify link state
            const linkState = await fixture.getLinkWithActions(linkId);
            expect(linkState.link.link_use_action_counter).toEqual(1n);
        });

        it("should complete the payment process", async () => {
            const result = await fixture.updateUserState(linkId, "Use", "Continue");

            expect(result[0].link_user_state).toEqual("User_state_completed_link");
        });
    });
});
