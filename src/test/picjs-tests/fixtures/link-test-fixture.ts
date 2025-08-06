// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

/* eslint-disable @typescript-eslint/no-explicit-any */
import { resolve } from "path";
import { Actor, createIdentity, PocketIc, SubnetStateType } from "@dfinity/pic";
import { Principal } from "@dfinity/principal";
import {
    idlFactory,
    type _SERVICE,
    UpdateLinkInput,
    ProcessActionInput,
    GetLinkOptions,
    Icrc112Request,
    ActionDto,
    GetLinkResp,
    LinkGetUserStateOutput,
    CreateActionInput,
    LinkDto,
    UserDto,
    CreateLinkInput,
} from "../../../../src/cashier_frontend/src/generated/cashier_backend/cashier_backend.did";
import { ICP_LABEL, MultipleTokenHelper } from "../utils/multiple-token-helper";
import { parseResultResponse, safeParseJSON } from "../utils/parser";
import { flattenAndFindByMethod } from "../utils/icrc-112";
import LinkHelper from "../utils/link-helper";
import { fromNullable, toNullable } from "@dfinity/utils";
import { Identity } from "@dfinity/agent";
import { Icrc112ExecutorV2 } from "../utils/icrc-112-v2";
import { FEE_CANISTER_ID } from "../constant";

export const WASM_PATH = resolve("artifacts", "cashier_backend.wasm.gz");

export interface LinkConfig {
    title: string;
    description: string;
    template: string;
    link_image_url: string;
    link_type: string;
    link_use_action_max_count: bigint;
}

export interface AssetInfo {
    chain: string;
    address: string;
    label: string;
    amount_per_link_use?: bigint;
}

export class LinkTestFixture {
    pic?: PocketIc;
    actor?: Actor<_SERVICE>;
    identities: Map<string, Identity>;
    multiTokenHelper?: MultipleTokenHelper;
    linkHelper?: LinkHelper;
    canisterId?: string;
    users: Record<string, UserDto> = {};

    constructor() {
        this.identities = new Map([
            ["alice", createIdentity("superSecretAlicePassword")],
            ["bob", createIdentity("superSecretBobPassword")],
            ["charlie", createIdentity("superSecretCharliePassword")],
            ["david", createIdentity("superSecretDavidPassword")],
            ["eve", createIdentity("superSecretEvePassword")],
        ]);
    }

    addIdentity(name: string, seed: string): void {
        this.identities.set(name, createIdentity(seed));
    }

    async setup(
        options: {
            currentTime?: number;
            advanceTimeAfterSetup?: number;
        } = {},
    ) {
        // Default time if not provided
        const currentTime = options.currentTime || new Date(1734434601000).getTime();
        const advanceTimeAfterSetup =
            options.advanceTimeAfterSetup !== undefined
                ? options.advanceTimeAfterSetup
                : 5 * 60 * 1000; // Default 5 minutes

        // Create PocketIc instance
        this.pic = await PocketIc.create(process.env.PIC_URL, {
            application: [
                {
                    state: {
                        type: SubnetStateType.New,
                    },
                },
                {
                    state: {
                        type: SubnetStateType.New,
                    },
                },
            ],
            nns: {
                state: {
                    type: SubnetStateType.New,
                },
            },
        });

        // Set time and tick
        await this.pic.setTime(currentTime);
        await this.pic.tick(1);

        // Setup the canister
        const fixture = await this.pic.setupCanister<_SERVICE>({
            idlFactory,
            wasm: WASM_PATH,
            targetCanisterId: Principal.fromText("jjio5-5aaaa-aaaam-adhaq-cai"),
            // targetSubnetId: Principal.fromText("4ecnw-byqwz-dtgss-ua2mh-pfvs7-c3lct-gtf4e-hnu75-j7eek-iifqm-sqe"),
        });

        this.canisterId = fixture.canisterId.toString();
        this.actor = fixture.actor;

        // Create users for Alice and Bob
        this.actor.setIdentity(this.identities.get("alice")!);
        await this.pic.advanceTime(1 * 60 * 1000);
        await this.pic.tick(50);

        const aliceUserRes = await this.actor.create_user();
        this.users["alice"] = parseResultResponse(aliceUserRes);

        this.actor.setIdentity(this.identities.get("bob")!);
        const bobUserRes = await this.actor.create_user();
        this.users["bob"] = parseResultResponse(bobUserRes);

        // Setup multiple token helpers
        this.multiTokenHelper = new MultipleTokenHelper(this.pic);
        await this.multiTokenHelper.init();
        await this.multiTokenHelper.setupCanister("token1");
        await this.multiTokenHelper.setupCanister("token2");
        await this.multiTokenHelper.setupCanister("token3");

        // Setup link helper
        this.linkHelper = new LinkHelper(this.pic);
        this.linkHelper.setupActor("ryjl3-tyaaa-aaaaa-aaaba-cai");

        // Advance time to ensure we're ready for transactions
        await this.pic.advanceTime(advanceTimeAfterSetup);
        await this.pic.tick(50);

        // Default back to Alice's identity
        this.actor.setIdentity(this.identities.get("alice")!);
    }

    async getUserDetails(userKey: string): Promise<UserDto> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }

        const user = this.users[userKey];
        if (!user) {
            throw new Error(`User ${userKey} not found`);
        }

        // Fetch user details from the actor
        await this.actor.setIdentity(this.identities.get(userKey)!);
        const response = await this.actor.get_user();
        return parseResultResponse(response);
    }

    async createLinkV2(
        linkType: string,
        config: LinkConfig,
        assets: AssetInfo[] = [],
        maxUseCount?: bigint,
    ): Promise<LinkDto> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }

        const formattedAssets = assets.map((asset) => ({
            chain: asset.chain,
            address: asset.address,
            label: asset.label,
            amount_per_link_use_action:
                asset.amount_per_link_use || asset.amount_per_link_use || BigInt(10_0000_0000),
        }));

        const input: CreateLinkInput = {
            title: config.title,
            asset_info: formattedAssets,
            link_type: linkType,
            description: config.description ? [config.description] : [],
            link_image_url: config.link_image_url ? [config.link_image_url] : [],
            template: config.template,
            link_use_action_max_count: maxUseCount || BigInt(1),
            nft_image: [],
        };
        const response = await this.actor.create_link(input);
        const link = parseResultResponse(response);

        return link;
    }

    async activateLink(linkId: string) {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }
        const updateInput: UpdateLinkInput = {
            id: linkId,
            action: "Continue",
            params: [],
        };

        const response = await this.actor.update_link(updateInput);
        return parseResultResponse(response);
    }

    async inactiveLink(linkId: string) {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }
        const updateInput: UpdateLinkInput = {
            id: linkId,
            action: "Continue",
            params: [],
        };
        const response = await this.actor.update_link(updateInput);

        return parseResultResponse(response);
    }

    async createAction(linkId: string, actionType: string): Promise<ActionDto> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }
        const input: CreateActionInput = {
            link_id: linkId,
            action_type: actionType,
        };

        const response = await this.actor.create_action(input);
        const result = parseResultResponse(response);

        return result;
    }

    async confirmAction(linkId: string, actionId: string, actionType: string): Promise<ActionDto> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }
        const input: ProcessActionInput = {
            link_id: linkId,
            action_id: actionId,
            action_type: actionType,
        };

        const response = await this.actor.process_action(input);
        console.log("[confirmAction] response", safeParseJSON(response));
        return parseResultResponse(response);
    }

    async processAction(linkId: string, actionId: string, actionType: string): Promise<ActionDto> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }
        const input: ProcessActionInput = {
            link_id: linkId,
            action_id: actionId,
            action_type: actionType,
        };

        const response = await this.actor.process_action(input);
        return parseResultResponse(response);
    }

    async getLinkWithActions(linkId: string, actionType?: string): Promise<GetLinkResp> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }
        const options: GetLinkOptions | null = actionType ? { action_type: actionType } : null;
        const response = await this.actor.get_link(linkId, toNullable(options));
        return parseResultResponse(response);
    }

    async checkLinkBalance(tokenId: string, linkId: string): Promise<bigint> {
        if (!this.linkHelper || !this.canisterId) {
            throw new Error("Link helper or canisterId is not initialized");
        }

        this.linkHelper.setupActor(tokenId);

        // Use the linkHelper to check the balance of the link
        const balance = await this.linkHelper.checkAccountBalanceWithSubAccount(
            this.canisterId,
            linkId,
        );

        return balance;
    }

    prepare_executor(
        requests: Icrc112Request[][],
        linkId: string,
        actionId: string,
        identity: Identity,
    ) {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }

        if (!this.pic) {
            throw new Error("PocketIc is not initialized");
        }

        if (!this.canisterId) {
            throw new Error("Canister ID is not initialized");
        }

        if (!this.multiTokenHelper) {
            throw new Error("MultiToken helper is not initialized");
        }

        const triggerTxMethod = flattenAndFindByMethod(requests, "trigger_transaction");

        const executor = new Icrc112ExecutorV2(
            requests,
            this.multiTokenHelper,
            identity,
            linkId,
            actionId,
            Principal.fromText(this.canisterId),
            this.actor,
            triggerTxMethod?.nonce[0],
        );

        return executor;
    }

    async switchToUser(userKey?: string): Promise<void> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }

        if (!this.pic) {
            throw new Error("PocketIc is not initialized");
        }

        if (!this.canisterId) {
            throw new Error("Canister ID is not initialized");
        }

        if (userKey) {
            const identity = this.identities.get(userKey);
            if (!identity) {
                throw new Error(`Identity for user ${userKey} not found`);
            }
            this.actor.setIdentity(identity);
        } else {
            this.switchToAnonymous();
        }
    }

    switchToAnonymous() {
        if (!this.pic) {
            throw new Error("PocketIc is not initialized");
        }
        if (!this.canisterId) {
            throw new Error("Canister ID is not initialized");
        }
        const anonymousActor = this.pic.createActor<_SERVICE>(
            idlFactory,
            Principal.fromText(this.canisterId),
        );

        this.actor = anonymousActor;
    }

    async getUserState(
        linkId: string,
        actionType: string,
        anonymousWalletAddress?: string,
    ): Promise<LinkGetUserStateOutput | undefined> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }
        const response = await this.actor.link_get_user_state({
            link_id: linkId,
            action_type: actionType,
            anonymous_wallet_address: anonymousWalletAddress ? [anonymousWalletAddress] : [],
        });

        if (response === undefined) {
            throw new Error("Response is undefined");
        }

        return fromNullable(parseResultResponse(response));
    }

    async updateUserState(
        linkId: string,
        actionType: string,
        goto: string,
        anonymousWalletAddress?: string,
    ): Promise<any> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }
        const response = await this.actor.link_update_user_state({
            link_id: linkId,
            action_type: actionType,
            goto: goto,
            anonymous_wallet_address: anonymousWalletAddress ? [anonymousWalletAddress] : [],
        });

        return parseResultResponse(response);
    }

    async processActionAnonymous(
        linkId: string,
        actionId: string,
        actionType: string,
        walletAddress: string,
    ): Promise<any> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }
        this.switchToAnonymous();

        const response = await this.actor.process_action_anonymous({
            action_id: actionId || "",
            link_id: linkId,
            action_type: actionType,
            wallet_address: walletAddress,
        });

        return parseResultResponse(response);
    }

    async advanceTime(milliseconds: number): Promise<void> {
        if (!this.pic) {
            throw new Error("PocketIc is not initialized");
        }
        await this.pic.advanceTime(milliseconds);
        await this.pic.tick(50);
    }

    async tearDown(): Promise<void> {
        if (!this.pic) {
            throw new Error("PocketIc is not initialized");
        }
        await this.pic.tearDown();
    }

    async completeCreateLinkFlow(
        linkType: string,
        config: LinkConfig,
        assets: AssetInfo[],
        maxUseCount?: bigint,
    ): Promise<string> {
        // Create link
        const link = await this.createLinkV2(linkType, config, assets, maxUseCount);
        return link.id;
    }

    async createActionForLink(
        linkId: string,
        actionType: string,
    ): Promise<{ linkId: string; actionId: string }> {
        // Create action
        const action = await this.createAction(linkId, actionType);

        return { linkId, actionId: action.id };
    }

    // Method to setup a tip link and claim it once
    // link only claim one
    async setupPreconfiguredTipLinkWithClaim(
        config?: LinkConfig,
        assets?: AssetInfo[],
        maxUseCount: bigint = BigInt(1),
    ): Promise<{
        linkId: string;
        claimActionId: string;
        balanceBefore: bigint;
    }> {
        // Use default config if not provided
        const defaultConfig: LinkConfig = {
            title: "tip 20 icp",
            description: "tip 20 icp to the user",
            template: "Central",
            link_image_url: "https://www.google.com",
            link_type: "SendTip",
            link_use_action_max_count: BigInt(1),
        };

        const defaultAssetInfo: AssetInfo = {
            chain: "IC",
            address: FEE_CANISTER_ID,
            label: "SEND_TIP_ASSET",
            amount_per_link_use: BigInt(10_0000_0000),
        };

        const linkConfig = config || defaultConfig;
        const linkAssets = assets || [defaultAssetInfo];

        // Switch to Alice to create the link
        this.switchToUser("alice");
        await this.advanceTime(1 * 60 * 1000);

        // Create the link
        const result = await this.completeActiveLinkFlow(
            "SendTip",
            linkConfig,
            linkAssets,
            maxUseCount,
        );
        const createdLinkId = result.link.id;

        // Verify link is active
        const linkState = await this.getLinkWithActions(createdLinkId, "CreateLink");
        if (linkState.link.state !== "Link_state_active") {
            throw new Error(`Link is not active. State: ${linkState.link.state}`);
        }

        // Switch to Bob to claim the link
        this.switchToUser("bob");
        await this.advanceTime(1 * 60 * 1000);

        // Create claim action
        const createdClaimActionId = (await this.createAction(createdLinkId, "Use")).id;

        // Process claim action
        const bobAccount = {
            owner: this.identities.get("bob")!.getPrincipal(),
            subaccount: [] as any,
        };

        // Get initial balance using multiTokenHelper
        const balanceBefore = await this.multiTokenHelper!.balanceOf("ICP", bobAccount);

        // Confirm the claim
        const claimResult = await this.confirmAction(createdLinkId, createdClaimActionId, "Use");
        if (claimResult.state !== "Action_state_success") {
            throw new Error(`Use action failed. State: ${claimResult.state}`);
        }

        // Complete the claim process
        await this.updateUserState(createdLinkId, "Use", "Continue");

        // back to Alice
        this.switchToUser("alice");

        return {
            linkId: createdLinkId,
            claimActionId: createdClaimActionId,
            balanceBefore,
        };
    }

    async advanceTimeAndTick(milliseconds: number): Promise<void> {
        if (!this.pic) {
            throw new Error("PocketIc is not initialized");
        }
        await this.pic.advanceTime(milliseconds);
        await this.pic.tick(1);
    }

    // Complete link creation flow in one function
    async completeActiveLinkFlow(
        linkType: string,
        config: LinkConfig,
        assets: AssetInfo[],
        maxUseCount?: bigint,
        identity: Identity = this.identities.get("alice")!,
        execute_tx: (executor: Icrc112ExecutorV2) => Promise<void> = async () => {},
    ): Promise<{ link: LinkDto; action: ActionDto }> {
        // Create link
        const link = await this.createLinkV2(linkType, config, assets, maxUseCount);

        const linkId = link.id;

        await this.advanceTimeAndTick(2000);

        // Create action
        const action = await this.createAction(linkId, "CreateLink");

        await this.advanceTimeAndTick(2000);

        // Confirm action
        const confirmResult = await this.confirmAction(linkId, action.id, "CreateLink");

        await this.advanceTimeAndTick(2000);

        // Execute ICRC-112 requests
        if (confirmResult.icrc_112_requests && confirmResult.icrc_112_requests[0]) {
            const requests = fromNullable(confirmResult.icrc_112_requests);

            if (!requests) {
                throw new Error("No ICRC-112 requests found");
            }

            const executor = this.prepare_executor(requests, linkId, action.id, identity);

            await execute_tx(executor);
        }

        const last_updated_action = await this.actor!.update_action({
            action_id: action.id,
            link_id: linkId,
            external: true,
        });

        await this.advanceTimeAndTick(50000);

        // Activate link
        await this.activateLink(linkId);

        return {
            link,
            action: parseResultResponse(last_updated_action),
        };
    }

    async executeIcrc112Requests(
        requests: Icrc112Request[][],
        linkId: string,
        actionId: string,
        identity: Identity = this.identities.get("alice")!,
        execute_tx: (executor: Icrc112ExecutorV2) => Promise<void> = async () => {},
    ): Promise<void> {
        if (!this.pic) {
            throw new Error("PocketIc is not initialized");
        }

        if (!this.canisterId) {
            throw new Error("Canister ID is not initialized");
        }

        if (!this.multiTokenHelper) {
            throw new Error("MultiToken helper is not initialized");
        }

        const executor = this.prepare_executor(requests, linkId, actionId, identity);

        await execute_tx(executor);
    }

    async postIcrc112Requests(linkId: string, actionId: string) {
        const last_updated_action = await this.actor!.update_action({
            action_id: actionId,
            link_id: linkId,
            external: true,
        });

        return parseResultResponse(last_updated_action);
    }

    async airdropTokensToUsers(airdropAmount: bigint, userKeys?: string[]): Promise<void> {
        if (!this.multiTokenHelper) {
            throw new Error("MultiToken helper is not initialized");
        }

        const tokens = [ICP_LABEL, "token1", "token2", "token3"];
        const usersToAirdrop = userKeys || Array.from(this.identities.keys());

        // Airdrop all tokens to specified users (or all users if not specified)
        for (const token of tokens) {
            for (const userKey of usersToAirdrop) {
                const identity = this.identities.get(userKey);
                if (identity) {
                    await this.multiTokenHelper.airdrop(
                        token,
                        airdropAmount,
                        identity.getPrincipal(),
                    );
                }
            }
        }
    }

    async getUserBalance(userKey: string, tokenName: string): Promise<bigint> {
        if (!this.multiTokenHelper) {
            throw new Error("MultiToken helper is not initialized");
        }

        const userIdentity = this.identities.get(userKey);
        if (!userIdentity) {
            throw new Error(`User identity for ${userKey} not found`);
        }

        const account = {
            owner: userIdentity.getPrincipal(),
            subaccount: [] as any,
        };

        return this.multiTokenHelper.balanceOf(tokenName, account);
    }

    async getWalletBalance(walletAddress: string, tokenName: string): Promise<bigint> {
        if (!this.multiTokenHelper) {
            throw new Error("MultiToken helper is not initialized");
        }

        const account = {
            owner: Principal.fromText(walletAddress),
            subaccount: [] as any,
        };

        return this.multiTokenHelper.balanceOf(tokenName, account);
    }

    async getTokenFee(tokenName: string): Promise<bigint> {
        if (!this.multiTokenHelper) {
            throw new Error("MultiToken helper is not initialized");
        }

        return this.multiTokenHelper.feeOf(tokenName);
    }
}
