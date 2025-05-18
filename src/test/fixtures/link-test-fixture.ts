/* eslint-disable @typescript-eslint/no-explicit-any */
import { resolve } from "path";
import { Actor, createIdentity, PocketIc, SubnetStateType } from "@dfinity/pic";
import { Principal } from "@dfinity/principal";
import {
    idlFactory,
    type _SERVICE,
    CreateLinkInput,
    UpdateLinkInput,
    ProcessActionInput,
    GetLinkOptions,
    Icrc112Request,
    CreateLinkInputV2,
    ActionDto,
    GetLinkResp,
    LinkGetUserStateOutput,
} from "../../declarations/cashier_backend/cashier_backend.did";
import { TokenHelper } from "../utils/token-helper";
import { MultipleTokenHelper } from "../utils/multiple-token-helper";
import { parseResultResponse, safeParseJSON } from "../utils/parser";
import { flattenAndFindByMethod, Icrc112Executor } from "../utils/icrc-112";
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
    amount_per_claim?: bigint;
    amount_per_link_use_action?: bigint;
}

export class LinkTestFixture {
    pic?: PocketIc;
    actor?: Actor<_SERVICE>;
    identities: {
        alice: Identity;
        bob: Identity;
    };
    tokenHelper?: TokenHelper;
    multiTokenHelper?: MultipleTokenHelper;
    linkHelper?: LinkHelper;
    canisterId?: string;
    users: Record<string, any> = {};

    constructor() {
        this.identities = {
            alice: createIdentity("superSecretAlicePassword"),
            bob: createIdentity("superSecretBobPassword"),
        };
    }

    async setup(
        options: {
            currentTime?: number;
            airdropAmount?: bigint;
            useMultipleTokens?: boolean;
            advanceTimeAfterSetup?: number;
        } = {},
    ) {
        // Default time if not provided
        const currentTime = options.currentTime || new Date(1734434601000).getTime();
        const airdropAmount = options.airdropAmount || BigInt(1_0000_0000_0000);
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

        const canisterSubnetId = await this.pic.getCanisterSubnetId(
            Principal.fromText("jjio5-5aaaa-aaaam-adhaq-cai"),
        );

        console.log("subnets jjio5-5aaaa-aaaam-adhaq-cai", canisterSubnetId?.toText());

        this.canisterId = fixture.canisterId.toString();
        this.actor = fixture.actor;

        // Create users for Alice and Bob
        this.actor.setIdentity(this.identities.alice);
        await this.pic.advanceTime(1 * 60 * 1000);
        await this.pic.tick(50);

        const aliceUserRes = await this.actor.create_user();
        this.users["alice"] = parseResultResponse(aliceUserRes);

        this.actor.setIdentity(this.identities.bob);
        const bobUserRes = await this.actor.create_user();
        this.users["bob"] = parseResultResponse(bobUserRes);

        // Setup token helpers
        if (options.useMultipleTokens) {
            this.multiTokenHelper = new MultipleTokenHelper(this.pic);
            await this.multiTokenHelper.init();
            await this.multiTokenHelper.setupCanister("token1");
            await this.multiTokenHelper.setupCanister("token2");
            await this.multiTokenHelper.setupCanister("token3");

            await this.multiTokenHelper.airdrop(
                "feeICP",
                airdropAmount,
                this.identities.alice.getPrincipal(),
            );
            await this.multiTokenHelper.airdrop(
                "token1",
                airdropAmount,
                this.identities.alice.getPrincipal(),
            );
            await this.multiTokenHelper.airdrop(
                "token2",
                airdropAmount,
                this.identities.alice.getPrincipal(),
            );
            await this.multiTokenHelper.airdrop(
                "token3",
                airdropAmount,
                this.identities.alice.getPrincipal(),
            );
        } else {
            this.tokenHelper = new TokenHelper(this.pic);
            await this.tokenHelper.setupCanister();
            await this.tokenHelper.airdrop(airdropAmount, this.identities.alice.getPrincipal());

            // Also give tokens to Bob in some tests
            await this.tokenHelper.airdrop(airdropAmount, this.identities.bob.getPrincipal());
        }

        const canisterSubnetId2 = await this.pic.getCanisterSubnetId(
            Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"),
        );

        console.log("subnets ryjl3-tyaaa-aaaaa-aaaba-cai", canisterSubnetId2?.toText());

        // Setup link helper
        this.linkHelper = new LinkHelper(this.pic);
        this.linkHelper.setupActor("ryjl3-tyaaa-aaaaa-aaaba-cai");

        // Advance time to ensure we're ready for transactions
        await this.pic.advanceTime(advanceTimeAfterSetup);
        await this.pic.tick(50);

        // Default back to Alice's identity
        this.actor.setIdentity(this.identities.alice);
    }

    async createLink(linkType: string): Promise<string> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }

        const input: CreateLinkInput = { link_type: linkType };
        const response = await this.actor.create_link(input);
        const linkId = parseResultResponse(response);

        return linkId;
    }

    async createLinkV2(
        linkType: string,
        config: LinkConfig,
        assets: AssetInfo[] = [],
        maxUseCount?: bigint,
    ): Promise<string> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }

        const formattedAssets = assets.map((asset) => ({
            chain: asset.chain,
            address: asset.address,
            label: asset.label,
            amount_per_link_use_action:
                asset.amount_per_link_use_action || asset.amount_per_claim || BigInt(10_0000_0000),
        }));

        const input: CreateLinkInputV2 = {
            title: config.title,
            asset_info: formattedAssets,
            link_type: linkType,
            description: config.description ? [config.description] : [],
            link_image_url: config.link_image_url ? [config.link_image_url] : [],
            template: config.template,
            link_use_action_max_count: maxUseCount || BigInt(1),
            nft_image: [],
        };
        const response = await this.actor.create_link_v2(input);
        const linkId = parseResultResponse(response);

        return linkId.id;
    }

    async setupTemplate(linkId: string, config: LinkConfig): Promise<any> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }
        const updateInput: UpdateLinkInput = {
            id: linkId,
            action: "Continue",
            params: [
                {
                    title: [config.title],
                    asset_info: [],
                    description: [],
                    template: [config.template],
                    link_image_url: [],
                    nft_image: [],
                    link_type: [config.link_type],
                    link_use_action_max_count: [],
                },
            ],
        };

        const response = await this.actor.update_link(updateInput);
        return parseResultResponse(response);
    }

    async addAssets(linkId: string, assets: AssetInfo[], maxUseCount?: bigint): Promise<any> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }
        const formattedAssets = assets.map((asset) => ({
            chain: asset.chain,
            address: asset.address,
            label: asset.label,
            amount_per_link_use_action:
                asset.amount_per_link_use_action || asset.amount_per_claim || BigInt(10_0000_0000),
        }));

        const updateInput: UpdateLinkInput = {
            id: linkId,
            action: "Continue",
            params: [
                {
                    title: [],
                    asset_info: [formattedAssets],
                    description: [],
                    template: [],
                    link_image_url: [],
                    nft_image: [],
                    link_type: [],
                    link_use_action_max_count: maxUseCount ? toNullable(maxUseCount) : [],
                },
            ],
        };

        const response = await this.actor.update_link(updateInput);
        return parseResultResponse(response);
    }

    async activateLink(linkId: string): Promise<any> {
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

    async createAction(linkId: string, actionType: string): Promise<string> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }
        const input: ProcessActionInput = {
            link_id: linkId,
            action_id: "",
            action_type: actionType,
        };

        const response = await this.actor.process_action(input);
        const result = parseResultResponse(response);

        return result.id;
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

    async executeIcrc112(
        requests: Icrc112Request[][],
        linkId: string,
        actionId: string,
        identity: Identity,
        options?: {
            icrc1TransferAmount?: bigint;
        },
    ): Promise<void> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }

        if (!this.tokenHelper) {
            throw new Error("Token helper is not initialized");
        }

        if (!this.pic) {
            throw new Error("PocketIc is not initialized");
        }

        if (!this.canisterId) {
            throw new Error("Canister ID is not initialized");
        }

        const triggerTxMethod = flattenAndFindByMethod(requests, "trigger_transaction");

        if (!triggerTxMethod || !triggerTxMethod.nonce[0]) {
            throw new Error("trigger_transaction method not found in icrc-112 requests");
        }

        const executor = new Icrc112Executor(
            requests,
            this.tokenHelper,
            identity,
            linkId,
            actionId,
            Principal.fromText(this.canisterId),
            this.actor,
            triggerTxMethod.nonce[0],
        );

        await executor.executeIcrc1Transfer(options?.icrc1TransferAmount);
        await executor.executeIcrc2Approve();

        await executor.triggerTransaction();
        await this.actor.update_action({
            action_id: actionId,
            link_id: linkId,
            external: true,
        });
    }

    async executeIcrc112V2(
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

        console.log("requests", safeParseJSON(requests as any));

        const triggerTxMethod = flattenAndFindByMethod(requests, "trigger_transaction");
        console.log("triggerTxMethod", triggerTxMethod);
        if (!triggerTxMethod) {
            throw new Error("trigger_transaction method not found in icrc-112 requests");
        }
        const executeHelper = new Icrc112ExecutorV2(
            requests,
            this.multiTokenHelper,
            identity,
            linkId,
            actionId,
            Principal.fromText(this.canisterId),
            this.actor,
            triggerTxMethod.nonce[0]!,
        );
        await executeHelper.executeIcrc1Transfer("token1", 10_0000_0000n);
        await executeHelper.executeIcrc1Transfer("token2", 20_0000_0000n);
        await executeHelper.executeIcrc1Transfer("token3", 30_0000_0000n);
        await executeHelper.executeIcrc2Approve("feeICP", 30_0000_0000n);
        await this.actor.update_action({
            action_id: actionId,
            link_id: linkId,
            external: true,
        });
        await executeHelper.triggerTransaction();
    }

    async switchToUser(userKey?: "alice" | "bob"): Promise<void> {
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
            this.actor.setIdentity(this.identities[userKey]);
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
        const linkId = await this.createLinkV2(linkType, config, assets, maxUseCount);
        return linkId;
    }

    async createActionForLink(
        linkId: string,
        actionType: string,
    ): Promise<{ linkId: string; actionId: string }> {
        // Create action
        const actionId = await this.createAction(linkId, actionType);

        return { linkId, actionId };
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
            amount_per_claim: BigInt(10_0000_0000),
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
        const createdLinkId = result.linkId;

        // Verify link is active
        const linkState = await this.getLinkWithActions(createdLinkId, "CreateLink");
        if (linkState.link.state !== "Link_state_active") {
            throw new Error(`Link is not active. State: ${linkState.link.state}`);
        }

        // Switch to Bob to claim the link
        this.switchToUser("bob");
        await this.advanceTime(1 * 60 * 1000);

        // Create claim action
        const createdClaimActionId = await this.createAction(createdLinkId, "Claim");

        // Process claim action
        const bobAccount = {
            owner: this.identities.bob.getPrincipal(),
            subaccount: [] as any,
        };

        // Get initial balance
        const balanceBefore = await this.tokenHelper!.balanceOf(bobAccount);

        // Confirm the claim
        const claimResult = await this.confirmAction(createdLinkId, createdClaimActionId, "Claim");
        if (claimResult.state !== "Action_state_success") {
            throw new Error(`Claim action failed. State: ${claimResult.state}`);
        }

        // Complete the claim process
        await this.updateUserState(createdLinkId, "Claim", "Continue");

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
        options?: {
            // only use if maxUseCount > 1, to transfer more than default 10_0000_0000
            icrc1TransferAmount?: bigint;
        },
    ): Promise<{ linkId: string; actionId: string }> {
        // Create link
        const linkId = await this.createLinkV2(linkType, config, assets, maxUseCount);

        await this.advanceTimeAndTick(2000);

        // Create action
        const actionId = await this.createAction(linkId, "CreateLink");

        await this.advanceTimeAndTick(2000);

        // Confirm action
        const confirmResult = await this.confirmAction(linkId, actionId, "CreateLink");

        await this.advanceTimeAndTick(2000);

        // Execute ICRC-112 requests
        if (confirmResult.icrc_112_requests && confirmResult.icrc_112_requests[0]) {
            const requests = fromNullable(confirmResult.icrc_112_requests);

            if (!requests) {
                throw new Error("No ICRC-112 requests found");
            }

            if (this.tokenHelper) {
                await this.executeIcrc112(
                    requests,
                    linkId,
                    actionId,
                    this.identities.alice,
                    options,
                );
            }

            if (this.multiTokenHelper) {
                await this.executeIcrc112V2(requests, linkId, actionId, this.identities.alice);
            }
        }

        await this.advanceTimeAndTick(2000);

        // Activate link
        await this.activateLink(linkId);

        return { linkId, actionId };
    }
}
