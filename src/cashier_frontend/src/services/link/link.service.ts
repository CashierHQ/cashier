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

import { convertTokenAmountToNumber, parseResultResponse } from "@/utils";
import {
    _SERVICE,
    CreateActionAnonymousInput,
    CreateActionInput,
    CreateLinkInputV2,
    idlFactory,
    LinkDto,
    LinkGetUserStateInput,
    LinkUpdateUserStateInput,
    ProcessActionAnonymousInput,
    ProcessActionInput,
    UpdateActionInput,
} from "../../../../declarations/cashier_backend/cashier_backend.did";
import { Actor, HttpAgent, Identity } from "@dfinity/agent";
import { BACKEND_CANISTER_ID, IC_HOST } from "@/const";
import { PartialIdentity } from "@dfinity/identity";
import {
    LinkGetUserStateInputModel,
    LinkModel,
    LinkUpdateUserStateInputModel,
} from "../types/link.service.types";
import {
    MapLinkDetailModel,
    mapLinkDetailModelToUpdateLinkInputModel,
    mapPartialDtoToLinkDetailModel,
    mapLinkUserStateModel,
} from "../types/mapper/link.service.mapper";
import { ActionModel } from "../types/action.service.types";
import { mapActionModel } from "../types/mapper/action.service.mapper";
import { FeeModel } from "../types/intent.service.types";
import { FEE_TYPE } from "../types/enum";
import { UserInputItem } from "@/stores/linkCreationFormStore";

export interface ResponseLinksModel {
    data: LinkModel[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: any;
}
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

/* TODO: Remove after BE have endpoint */
interface FeeDto {
    type: FEE_TYPE.LINK_CREATION;
    amount: bigint;
    asset: AssetDto;
}

interface AssetDto {
    address: string;
    chain: string;
}

class LinkService {
    private actor: _SERVICE;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        const agent = HttpAgent.createSync({ identity, host: IC_HOST });
        this.actor = Actor.createActor(idlFactory, {
            agent,
            canisterId: BACKEND_CANISTER_ID,
        });
        console.log("LinkService initialized with actor:", this.actor);
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

        const responseModel: ResponseLinksModel = {
            data: [],
            metadata: response.metadata,
        };
        responseModel.data = response.data
            ? response.data.map((link: LinkDto) => {
                  return {
                      link: mapPartialDtoToLinkDetailModel(link),
                      action_create: undefined,
                  };
              })
            : [];
        return responseModel;
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
        const result = await MapLinkDetailModel(response);
        return result;
    }

    async createLinkV2(input: CreateLinkInputV2) {
        return parseResultResponse(await this.actor.create_link_v2(input));
    }

    async updateLink(linkId: string, data: Partial<UserInputItem>, isContinue: boolean) {
        const completeData = mapLinkDetailModelToUpdateLinkInputModel(linkId, data, isContinue);
        const response = parseResultResponse(await this.actor.update_link(completeData));

        return response;
    }

    async processAction(input: ProcessActionInputModel): Promise<ActionModel> {
        const inputModel: ProcessActionInput = {
            action_id: input.actionId ?? "",
            link_id: input.linkId,
            action_type: input.actionType,
        };
        const response = parseResultResponse(await this.actor.process_action(inputModel));
        const action = mapActionModel(response);
        return action;
    }

    async processActionV2(input: ProcessActionInputModel): Promise<ActionModel> {
        const inputModel: ProcessActionInput = {
            action_id: input.actionId,
            link_id: input.linkId,
            action_type: input.actionType,
        };
        const response = parseResultResponse(await this.actor.process_action(inputModel));
        const action = mapActionModel(response);
        return action;
    }

    async createAction(input: CreateLinkInputModel): Promise<ActionModel> {
        const inputModel: CreateActionInput = {
            link_id: input.linkId,
            action_type: input.actionType,
        };
        const response = parseResultResponse(await this.actor.create_action(inputModel));
        const action = mapActionModel(response);
        return action;
    }

    async processActionAnonymous(input: UpdateActionAnonymousInputModel): Promise<ActionModel> {
        const inputModel: ProcessActionAnonymousInput = {
            action_id: input.actionId,
            link_id: input.linkId,
            action_type: input.actionType,
            wallet_address: input.walletAddress,
        };
        const response = parseResultResponse(await this.actor.process_action_anonymous(inputModel));
        const action = mapActionModel(response);
        return action;
    }

    async createActionAnonymous(input: CreateActionAnonymousInputModel): Promise<ActionModel> {
        const inputModel: CreateActionAnonymousInput = {
            link_id: input.linkId,
            action_type: input.actionType,
            wallet_address: input.walletAddress,
        };
        const response = parseResultResponse(await this.actor.create_action_anonymous(inputModel));
        const action = mapActionModel(response);
        return action;
    }

    async processActionAnonymousV2(input: UpdateActionAnonymousInputModel): Promise<ActionModel> {
        const inputModel: ProcessActionAnonymousInput = {
            action_id: input.actionId,
            link_id: input.linkId,
            action_type: input.actionType,
            wallet_address: input.walletAddress,
        };
        const response = parseResultResponse(await this.actor.process_action_anonymous(inputModel));
        const action = mapActionModel(response);
        return action;
    }

    async updateAction(inputModel: UpdateActionInputModel) {
        const input: UpdateActionInput = {
            action_id: inputModel.actionId,
            link_id: inputModel.linkId,
            external: inputModel.external ?? true,
        };
        const response = parseResultResponse(await this.actor.update_action(input));
        const action = mapActionModel(response);
        return action;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getFeePreview(linkId: string): Promise<FeeModel[]> {
        const mockBackEndResponse: FeeDto[] = [
            {
                type: FEE_TYPE.LINK_CREATION,
                amount: BigInt(convertTokenAmountToNumber(0.001, 8)),
                asset: {
                    address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
                    chain: "IC",
                },
            },
        ];

        return mockBackEndResponse.map((fee) => {
            return {
                type: fee.type,
                amount: fee.amount,
                address: fee.asset.address,
                chain: fee.asset.chain,
            };
        });
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
        return mapLinkUserStateModel(response);
    }

    async updateLinkUserState(input: LinkUpdateUserStateInputModel) {
        console.log("🚀 ~ LinkService ~ updateLinkUserState ~ input:", input);
        const params: LinkUpdateUserStateInput = {
            link_id: input.link_id,
            action_type: input.action_type,
            goto: input.isContinue ? "Continue" : "Back",
            anonymous_wallet_address: input.anonymous_wallet_address
                ? [input.anonymous_wallet_address]
                : [],
        };
        const response = parseResultResponse(await this.actor.link_update_user_state(params));
        return mapLinkUserStateModel(response);
    }
}

export default LinkService;
