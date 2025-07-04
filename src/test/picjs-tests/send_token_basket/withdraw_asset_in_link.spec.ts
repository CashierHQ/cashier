// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

/* eslint-disable @typescript-eslint/no-explicit-any */
import { LinkTestFixture, LinkConfig, AssetInfo } from "../fixtures/link-test-fixture";
import { IntentDto } from "../../../declarations/cashier_backend/cashier_backend.did";
import { fromNullable, toNullable } from "@dfinity/utils";
import { CREATE_LINK_FEE, TREASURY_WALLET } from "../constant";
import { Icrc112ExecutorV2 } from "../utils/icrc-112-v2";
import { safeParseJSON } from "../utils/parser";

describe("Test withdraw for send token basket link", () => {
    const fixture = new LinkTestFixture();
    let linkId: string;

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

    describe("Create link and withdraw unclaimed tokens", () => {
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
            // Total ICP cost =  CREATE_LINK_FEE
            const expectedIcpBalanceAfter =
                icpBalanceBefore - CREATE_LINK_FEE - ledger_fee * BigInt(2);
            console.log("Alice ICP balance after", icpBalanceAfter);
            console.log("Expected ICP balance after", expectedIcpBalanceAfter);
            expect(icpBalanceAfter).toEqual(expectedIcpBalanceAfter);

            // Verify treasury balance after link creation
            const treasury_balance_after = await fixture.getWalletBalance(TREASURY_WALLET, "ICP");
            expect(treasury_balance_after).toEqual(expected_treasury_balance);
        });
    });

    it("should be able to withdraw unclaimed token basket", async () => {
        const inactive_link = await fixture.inactiveLink(linkId);
        const linkBalancesBefore = new Map<string, bigint>();
        const creatorBalancesBefore = new Map<string, bigint>();

        expect(inactive_link.state).toEqual("Link_state_inactive");

        // Get balances before withdrawal for all assets
        for (const asset of assets) {
            const linkBalance = await fixture.checkLinkBalance(asset.address, linkId);
            linkBalancesBefore.set(asset.address, linkBalance);

            const creatorBalance = await fixture.getUserBalance("alice", asset.tokenIndex);
            creatorBalancesBefore.set(asset.tokenIndex, creatorBalance);
        }

        const action = await fixture.createAction(linkId, "Withdraw");
        expect(action.state).toEqual("Action_state_created");

        const processedAction = await fixture.processAction(linkId, action.id, "Withdraw");

        console.log("processedAction", safeParseJSON(processedAction as any));

        expect(processedAction.state).toEqual("Action_state_success");
        processedAction.intents.forEach((intent: IntentDto) => {
            expect(intent.state).toEqual("Intent_state_success");
        });

        // Verify balances after withdrawal for all assets
        for (const asset of assets) {
            const linkBalanceAfter = await fixture.checkLinkBalance(asset.address, linkId);
            expect(linkBalanceAfter).toEqual(0n);

            const creatorBalanceAfter = await fixture.getUserBalance("alice", asset.tokenIndex);
            const linkBalanceBefore = linkBalancesBefore.get(asset.address) || BigInt(0);
            const creatorBalanceBefore = creatorBalancesBefore.get(asset.tokenIndex) || BigInt(0);
            const assetLedgerFee = await fixture.getTokenFee(asset.tokenIndex);

            const expectedCreatorBalanceAfter =
                creatorBalanceBefore + linkBalanceBefore - assetLedgerFee;
            expect(creatorBalanceAfter).toEqual(expectedCreatorBalanceAfter);
        }
    });
});
