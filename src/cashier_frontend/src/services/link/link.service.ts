// Copyright (c) 2025 Cashier Protocol Labs
// Licensed under the MIT License (see LICENSE file in the project root)

import { convertTokenAmountToNumber, parseResultResponse } from "@/utils";
import {
  _SERVICE,
  CreateActionAnonymousInput,
  CreateActionInput,
  CreateLinkInput,
  idlFactory,
  LinkDto,
  LinkGetUserStateInput,
  LinkUpdateUserStateInput,
  ProcessActionAnonymousInput,
  ProcessActionInput,
  UpdateActionInput,
} from "../../generated/cashier_backend/cashier_backend.did";
import { Actor, Identity } from "@dfinity/agent";
import { BACKEND_CANISTER_ID } from "@/const";
import { PartialIdentity } from "@dfinity/identity";
import {
  LinkGetUserStateInputModel,
  LinkModel,
  LinkUpdateUserStateInputModel,
} from "../types/link.service.types";
import {
  mapLinkDetailModelToUpdateLinkInputModel,
  mapLinkUserStateModel,
  mapLinkDetailModel,
  mapFrontendGotoToUserStateMachineGoto,
  mapDtoToLinkDetailModel,
} from "../types/mapper/link.service.mapper";
import { ActionModel } from "../types/action.service.types";
import {
  mapActionModel,
  mapFrontendActionTypeToActionType,
} from "../types/mapper/action.service.mapper";
import { FeeModel } from "../types/intent.service.types";
import { ACTION_TYPE, FEE_TYPE } from "../types/enum";
import { UserInputItem } from "@/stores/linkCreationFormStore";
import { getAgent } from "@/utils/agent";
import { fromNullable, toNullable } from "@dfinity/utils";
import { Principal } from "@dfinity/principal";

export interface ResponseLinksModel {
  data: LinkModel[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
}
interface ProcessActionInputModel {
  linkId: string;
  actionType: ACTION_TYPE;
  actionId: string;
}

interface CreateLinkInputModel {
  linkId: string;
  actionType: ACTION_TYPE;
}

interface CreateActionAnonymousInputModel {
  linkId: string;
  actionType: ACTION_TYPE;
  walletAddress: string;
}

interface UpdateActionAnonymousInputModel {
  linkId: string;
  actionType: ACTION_TYPE;
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
    const agent = getAgent(identity);
    this.actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: BACKEND_CANISTER_ID,
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

    const responseModel: ResponseLinksModel = {
      data: [],
      metadata: response.metadata,
    };
    responseModel.data = response.data
      ? response.data.map((link: LinkDto) => {
          return {
            link: mapDtoToLinkDetailModel(link),
            action_create: undefined,
          };
        })
      : [];
    return responseModel;
  }

  async getLink(linkId: string, actionType?: ACTION_TYPE) {
    const response = parseResultResponse(
      await this.actor.get_link(
        linkId,
        toNullable(
          actionType
            ? {
                action_type: mapFrontendActionTypeToActionType(actionType),
              }
            : undefined,
        ),
      ),
    );
    const result = await mapLinkDetailModel(response);
    return result;
  }

  async createLink(input: CreateLinkInput) {
    console.log("Creating link with input:", input);
    return parseResultResponse(await this.actor.create_link(input));
  }

  async updateLink(
    linkId: string,
    data: Partial<UserInputItem>,
    isContinue: boolean,
  ) {
    const completeData = mapLinkDetailModelToUpdateLinkInputModel(
      linkId,
      data,
      isContinue,
    );
    const response = parseResultResponse(
      await this.actor.update_link(completeData),
    );

    return response;
  }

  async processAction(input: ProcessActionInputModel): Promise<ActionModel> {
    const inputModel: ProcessActionInput = {
      action_id: input.actionId,
      link_id: input.linkId,
      action_type: mapFrontendActionTypeToActionType(input.actionType),
    };
    const response = parseResultResponse(
      await this.actor.process_action(inputModel),
    );
    const action = mapActionModel(response);
    return action;
  }

  async createAction(input: CreateLinkInputModel): Promise<ActionModel> {
    const inputModel: CreateActionInput = {
      link_id: input.linkId,
      action_type: mapFrontendActionTypeToActionType(input.actionType),
    };
    const response = parseResultResponse(
      await this.actor.create_action(inputModel),
    );
    const action = mapActionModel(response);
    return action;
  }

  async processActionAnonymous(
    input: UpdateActionAnonymousInputModel,
  ): Promise<ActionModel> {
    const inputModel: ProcessActionAnonymousInput = {
      action_id: input.actionId,
      link_id: input.linkId,
      action_type: mapFrontendActionTypeToActionType(input.actionType),
      wallet_address: Principal.fromText(input.walletAddress),
    };
    const response = parseResultResponse(
      await this.actor.process_action_anonymous(inputModel),
    );
    const action = mapActionModel(response);
    return action;
  }

  async createActionAnonymous(
    input: CreateActionAnonymousInputModel,
  ): Promise<ActionModel> {
    const inputModel: CreateActionAnonymousInput = {
      link_id: input.linkId,
      action_type: mapFrontendActionTypeToActionType(input.actionType),
      wallet_address: Principal.fromText(input.walletAddress),
    };
    const response = parseResultResponse(
      await this.actor.create_action_anonymous(inputModel),
    );
    const action = mapActionModel(response);
    return action;
  }

  async processActionAnonymousV2(
    input: UpdateActionAnonymousInputModel,
  ): Promise<ActionModel> {
    const inputModel: ProcessActionAnonymousInput = {
      action_id: input.actionId,
      link_id: input.linkId,
      action_type: mapFrontendActionTypeToActionType(input.actionType),
      wallet_address: Principal.fromText(input.walletAddress),
    };
    const response = parseResultResponse(
      await this.actor.process_action_anonymous(inputModel),
    );
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
      action_type: mapFrontendActionTypeToActionType(input.action_type),
      anonymous_wallet_address: input.anonymous_wallet_address
        ? [Principal.fromText(input.anonymous_wallet_address)]
        : [],
    };
    const response = parseResultResponse(
      await this.actor.link_get_user_state(params),
    );
    const parsedRes = fromNullable(response);
    return parsedRes ? mapLinkUserStateModel(parsedRes) : undefined;
  }

  async updateLinkUserState(input: LinkUpdateUserStateInputModel) {
    const params: LinkUpdateUserStateInput = {
      link_id: input.link_id,
      action_type: mapFrontendActionTypeToActionType(input.action_type),
      goto: mapFrontendGotoToUserStateMachineGoto(
        input.isContinue ? "Continue" : "Back",
      ),
      anonymous_wallet_address: input.anonymous_wallet_address
        ? [Principal.fromText(input.anonymous_wallet_address)]
        : [],
    };
    const response = parseResultResponse(
      await this.actor.link_update_user_state(params),
    );
    const parsedRes = fromNullable(response);
    return parsedRes ? mapLinkUserStateModel(parsedRes) : undefined;
  }
}

export default LinkService;
