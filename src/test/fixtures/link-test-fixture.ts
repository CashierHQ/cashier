/* eslint-disable @typescript-eslint/no-explicit-any */
import { resolve } from "path";
import { Actor, createIdentity, PocketIc } from "@hadronous/pic";
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
} from "../../declarations/cashier_backend/cashier_backend.did";
import { TokenHelper } from "../utils/token-helper";
import { MultipleTokenHelper } from "../utils/multiple-token-helper";
import { parseResultResponse } from "../utils/parser";
import { flattenAndFindByMethod, Icrc112Executor } from "../utils/icrc-112";
import LinkHelper from "../utils/link-helper";
import { toNullable } from "@dfinity/utils";
import { Identity } from "@dfinity/agent";

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
        } = {},
    ) {
        // Default time if not provided
        const currentTime = options.currentTime || new Date(1734434601000).getTime();
        const airdropAmount = options.airdropAmount || BigInt(1_0000_0000_0000);

        // Create PocketIc instance
        this.pic = await PocketIc.create(process.env.PIC_URL);

        // Set time and tick
        await this.pic.setTime(currentTime);
        await this.pic.tick(1);

        // Setup the canister
        const fixture = await this.pic.setupCanister<_SERVICE>({
            idlFactory,
            wasm: WASM_PATH,
        });

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
        } else {
            this.tokenHelper = new TokenHelper(this.pic);
            await this.tokenHelper.setupCanister();
            await this.tokenHelper.airdrop(airdropAmount, this.identities.alice.getPrincipal());

            // Also give tokens to Bob in some tests
            await this.tokenHelper.airdrop(airdropAmount, this.identities.bob.getPrincipal());
        }

        // Setup link helper
        this.linkHelper = new LinkHelper(this.pic);
        this.linkHelper.setupActor("x5qut-viaaa-aaaar-qajda-cai");

        // Advance time to ensure we're ready for transactions
        await this.pic.advanceTime(5 * 60 * 1000);
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

        return linkId;
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

    async confirmAction(linkId: string, actionId: string, actionType: string): Promise<any> {
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

    async getLinkWithActions(linkId: string, actionType?: string): Promise<any> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }
        const options: GetLinkOptions | null = actionType ? { action_type: actionType } : null;
        const response = await this.actor.get_link(linkId, toNullable(options));
        return parseResultResponse(response);
    }

    async executeIcrc112(
        requests: Icrc112Request[][],
        linkId: string,
        actionId: string,
        identity: Identity,
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

        await executor.executeIcrc1Transfer();
        await executor.executeIcrc2Approve();

        await this.actor.update_action({
            action_id: actionId,
            link_id: linkId,
            external: true,
        });

        await executor.triggerTransaction();
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
    ): Promise<any> {
        if (!this.actor) {
            throw new Error("Actor is not initialized");
        }
        const response = await this.actor.link_get_user_state({
            link_id: linkId,
            action_type: actionType,
            anonymous_wallet_address: anonymousWalletAddress ? [anonymousWalletAddress] : [],
        });

        return parseResultResponse(response);
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

    // Complete link creation flow in one function
    async completeActiveLinkFlow(
        linkType: string,
        config: LinkConfig,
        assets: AssetInfo[],
        maxUseCount?: bigint,
    ): Promise<{ linkId: string; actionId: string }> {
        // Create link
        const linkId = await this.createLinkV2(linkType, config, assets, maxUseCount);

        // Create action
        const actionId = await this.createAction(linkId, "CreateLink");

        // Confirm action
        const confirmResult = await this.confirmAction(linkId, actionId, "CreateLink");

        // Execute ICRC-112 requests
        if (confirmResult.icrc_112_requests && confirmResult.icrc_112_requests[0]) {
            await this.executeIcrc112(
                confirmResult.icrc_112_requests[0],
                linkId,
                actionId,
                this.identities.alice,
            );
        }

        // Activate link
        await this.activateLink(linkId);

        return { linkId, actionId };
    }
}
