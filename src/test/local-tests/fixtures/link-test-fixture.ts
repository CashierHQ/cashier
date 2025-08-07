// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import {
    _SERVICE,
    CreateActionAnonymousInput,
    CreateActionInput,
    idlFactory,
    LinkDto,
    LinkGetUserStateInput,
    LinkUpdateUserStateInput,
    ProcessActionAnonymousInput,
    ProcessActionInput,
    UpdateActionInput,
    ActionDto,
    UpdateLinkInput,
    CreateLinkInput,
} from "../../../../src/cashier_frontend/src/generated/cashier_backend/cashier_backend.did";
import { Actor, HttpAgent, Identity } from "@dfinity/agent";
import { PartialIdentity } from "@dfinity/identity";
import { TokenUtilServiceFixture } from "./token-utils-fixture";
import { parseResultResponse } from "../utils";

export interface ProcessActionInputModel {
    linkId: string;
    actionType: string;
    actionId: string;
}

export interface CreateLinkInputModel {
    linkId: string;
    actionType: string;
}

export interface CreateActionAnonymousInputModel {
    linkId: string;
    actionType: string;
    walletAddress: string;
}

export interface UpdateActionAnonymousInputModel {
    linkId: string;
    actionType: string;
    actionId: string;
    walletAddress: string;
}

export interface UpdateActionInputModel {
    actionId: string;
    linkId: string;
    external: boolean;
}

export interface LinkGetUserStateInputModel {
    link_id: string;
    action_type: string;
    anonymous_wallet_address?: string;
}

export interface LinkUpdateUserStateInputModel {
    link_id: string;
    action_type: string;
    isContinue: boolean;
    anonymous_wallet_address?: string;
}

export class LinkServiceFixture {
    private actor: _SERVICE;

    constructor(
        identity: Identity | PartialIdentity,
        canisterId: string,
        host: string = "http://127.0.0.1:4943",
    ) {
        const agent = HttpAgent.createSync({ identity, host });

        // Fetch root key for local development
        agent.fetchRootKey().catch((err: Error) => {
            console.warn(
                "Unable to fetch root key. Check to ensure that your local replica is running",
            );
            console.error(err);
        });

        this.actor = Actor.createActor(idlFactory, {
            agent,
            canisterId,
        });
    }

    async getLinkList() {
        const response = parseResultResponse(
            await this.actor.get_links([
                {
                    offset: BigInt(0),
                    limit: BigInt(1000),
                },
            ]),
        );

        return response;
    }

    async getLink(linkId: string, actionType?: string) {
        const response = parseResultResponse(
            await this.actor.get_link(
                linkId,
                actionType
                    ? [
                          {
                              action_type: actionType,
                          },
                      ]
                    : [],
            ),
        );
        return response;
    }

    async createLinkV2(input: CreateLinkInput): Promise<LinkDto> {
        return parseResultResponse(await this.actor.create_link(input));
    }

    async updateLink(linkId: string, isContinue: boolean) {
        const completeData: UpdateLinkInput = {
            id: linkId,
            action: isContinue ? "Continue" : "Back",
            params: [],
        };
        const response = parseResultResponse(await this.actor.update_link(completeData));
        return response;
    }

    async processAction(input: ProcessActionInputModel): Promise<ActionDto> {
        const inputModel: ProcessActionInput = {
            action_id: input.actionId ?? "",
            link_id: input.linkId,
            action_type: input.actionType,
        };
        const response = parseResultResponse(await this.actor.process_action(inputModel));
        return response;
    }

    async createAction(input: CreateLinkInputModel): Promise<ActionDto> {
        const inputModel: CreateActionInput = {
            link_id: input.linkId,
            action_type: input.actionType,
        };
        const response = parseResultResponse(await this.actor.create_action(inputModel));
        return response;
    }

    async processActionAnonymous(input: UpdateActionAnonymousInputModel): Promise<ActionDto> {
        const inputModel: ProcessActionAnonymousInput = {
            action_id: input.actionId,
            link_id: input.linkId,
            action_type: input.actionType,
            wallet_address: input.walletAddress,
        };
        const response = parseResultResponse(await this.actor.process_action_anonymous(inputModel));
        return response;
    }

    async createActionAnonymous(input: CreateActionAnonymousInputModel): Promise<ActionDto> {
        const inputModel: CreateActionAnonymousInput = {
            link_id: input.linkId,
            action_type: input.actionType,
            wallet_address: input.walletAddress,
        };
        const response = parseResultResponse(await this.actor.create_action_anonymous(inputModel));
        return response;
    }

    async updateAction(inputModel: UpdateActionInputModel): Promise<ActionDto> {
        const input: UpdateActionInput = {
            action_id: inputModel.actionId,
            link_id: inputModel.linkId,
            external: inputModel.external ?? true,
        };
        const response = parseResultResponse(await this.actor.update_action(input));
        return response;
    }

    async getLinkUserState(input: LinkGetUserStateInputModel) {
        const params: LinkGetUserStateInput = {
            link_id: input.link_id,
            action_type: input.action_type,
            anonymous_wallet_address: input.anonymous_wallet_address
                ? [input.anonymous_wallet_address]
                : [],
        };
        const response = parseResultResponse(await this.actor.link_get_user_state(params));
        return response;
    }

    async updateLinkUserState(input: LinkUpdateUserStateInputModel) {
        console.log("🚀 ~ LinkServiceFixture ~ updateLinkUserState ~ input:", input);
        const params: LinkUpdateUserStateInput = {
            link_id: input.link_id,
            action_type: input.action_type,
            goto: input.isContinue ? "Continue" : "Back",
            anonymous_wallet_address: input.anonymous_wallet_address
                ? [input.anonymous_wallet_address]
                : [],
        };
        const response = parseResultResponse(await this.actor.link_update_user_state(params));
        return response;
    }
}

export default LinkServiceFixture;

// Additional interfaces and types for full flow support
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

export interface LinkFlowResult {
    link: LinkDto;
    action: ActionDto;
}

// Extended LinkServiceFixture with full flow methods
export class LinkServiceFixtureExtended extends LinkServiceFixture {
    private tokenUtilService?: TokenUtilServiceFixture;

    constructor(
        identity: Identity | PartialIdentity,
        canisterId: string,
        host: string = "http://127.0.0.1:4943",
    ) {
        super(identity, canisterId, host);
    }

    setTokenUtilService(tokenUtilService: TokenUtilServiceFixture) {
        this.tokenUtilService = tokenUtilService;
    }

    async createLinkV2Extended(
        linkType: string,
        config: LinkConfig,
        assets: AssetInfo[] = [],
        maxUseCount?: bigint,
    ): Promise<LinkDto> {
        const formattedAssets = assets.map((asset) => ({
            chain: asset.chain,
            address: asset.address,
            label: asset.label,
            amount_per_link_use_action: asset.amount_per_link_use || BigInt(10_0000_0000),
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

        return await super.createLinkV2(input);
    }

    async activateLink(linkId: string) {
        return await super.updateLink(linkId, true);
    }

    async completeActiveLinkFlow(
        linkType: string,
        config: LinkConfig,
        assets: AssetInfo[],
        maxUseCount?: bigint,
    ): Promise<LinkFlowResult> {
        // Step 1: Create link
        const link = await this.createLinkV2Extended(linkType, config, assets, maxUseCount);
        const linkId = link.id;

        // Step 2: Create action for link creation
        const action = await this.createAction({
            linkId: linkId,
            actionType: "CreateLink",
        });

        // Step 3: Process the action to get ICRC-112 requests
        const processedAction = await this.processAction({
            linkId: linkId,
            actionId: action.id,
            actionType: "CreateLink",
        });

        // Step 4: Handle ICRC-112 requests if they exist
        if (processedAction.icrc_112_requests && processedAction.icrc_112_requests.length > 0) {
            console.log("ICRC-112 requests detected - assuming external handling");
        }

        // Step 5: Update action to mark external transactions as complete
        const updatedAction = await this.updateAction({
            actionId: action.id,
            linkId: linkId,
            external: true,
        });

        // Step 6: Activate the link
        await this.activateLink(linkId);

        // Step 7: Get the final link state
        const finalLink = await this.getLink(linkId, "CreateLink");

        return {
            link: finalLink.link,
            action: updatedAction,
        };
    }

    async getUserBalance(tokenAddress: string): Promise<bigint> {
        if (!this.tokenUtilService) {
            throw new Error("Token utility service not configured");
        }
        return await this.tokenUtilService.balanceOf(tokenAddress);
    }

    async getTokenFee(tokenAddress: string): Promise<bigint> {
        if (!this.tokenUtilService) {
            throw new Error("Token utility service not configured");
        }
        return await this.tokenUtilService.getFee(tokenAddress);
    }
}
