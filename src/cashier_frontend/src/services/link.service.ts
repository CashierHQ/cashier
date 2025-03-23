import { convertTokenAmountToNumber, parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/cashier_backend";
import {
    _SERVICE,
    CreateLinkInput,
    LinkDto,
    LinkGetUserStateInput,
    LinkUpdateUserStateInput,
    ProcessActionInput,
    UpdateActionInput,
} from "../../../declarations/cashier_backend/cashier_backend.did";
import { HttpAgent, Identity } from "@dfinity/agent";
import { BACKEND_CANISTER_ID } from "@/const";
import { PartialIdentity } from "@dfinity/identity";
import {
    LinkDetailModel,
    LinkGetUserStateInputModel,
    LinkGetUserStateOutputModel,
    LinkModel,
    LinkUpdateUserStateInputModel,
} from "./types/link.service.types";
import {
    MapLinkDetailModel,
    MapLinkDetailModelToUpdateLinkInputModel,
    MapLinkToLinkDetailModel,
    mapLinkUserStateModel,
} from "./types/mapper/link.service.mapper";
import { ActionModel } from "./types/action.service.types";
import { mapActionModel } from "./types/mapper/action.service.mapper";
import { FeeModel } from "./types/intent.service.types";
import {
    ACTION_STATE,
    ACTION_TYPE,
    CHAIN,
    FEE_TYPE,
    INTENT_STATE,
    INTENT_TYPE,
    LINK_USER_STATE,
    TASK,
} from "./types/enum";

interface ResponseLinksModel {
    data: LinkModel[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: any;
}
export interface CreateActionInputModel {
    linkId: string;
    actionType: string;
    actionId?: string;
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
        this.actor = createActor(BACKEND_CANISTER_ID, {
            agent: HttpAgent.createSync({ identity, host: "https://icp0.io" }),
        });
    }

    async getLinks() {
        const response = parseResultResponse(
            await this.actor.get_links([
                {
                    offset: BigInt(0),
                    limit: BigInt(30),
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
                      link: MapLinkToLinkDetailModel(link),
                      action_create: undefined,
                  };
              })
            : [];
        return responseModel;
    }

    async getLink(linkId: string, actionType?: string) {
        console.log(linkId);
        console.log(actionType);
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

    async createLink(input: CreateLinkInput) {
        return parseResultResponse(await this.actor.create_link(input));
    }

    async updateLink(linkId: string, data: LinkDetailModel, isContinue: boolean) {
        const completeData = MapLinkDetailModelToUpdateLinkInputModel(linkId, data, isContinue);
        const response = parseResultResponse(await this.actor.update_link(completeData));
        return response;
    }

    async validateLink(): Promise<boolean> {
        // Mock function for validation
        return false;
    }

    async processAction(input: CreateActionInputModel): Promise<ActionModel> {
        const inputModel: ProcessActionInput = {
            action_id: input.actionId ?? "",
            link_id: input.linkId,
            action_type: input.actionType,
        };
        const response = parseResultResponse(await this.actor.process_action(inputModel));
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

    //TODO: Mock response data, remove after BE finish implementation
    async getLinkUserState(input: LinkGetUserStateInputModel) {
        const params: LinkGetUserStateInput = {
            link_id: input.link_id,
            action_type: input.action_type,
            anonymous_wallet_address: input.anonymous_wallet_address
                ? [input.anonymous_wallet_address]
                : [],
        };

        //const response = parseResultResponse(await this.actor.link_get_user_state(params));
        const mockResponse: LinkGetUserStateOutputModel = {
            action: {
                id: "action_id",
                state: ACTION_STATE.CREATED,
                creator: "",
                intents: [
                    {
                        id: "1",
                        state: INTENT_STATE.CREATED,
                        asset: {
                            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
                            chain: "IC",
                        },
                        chain: CHAIN.IC,
                        task: TASK.TRANSFER_LINK_TO_WALLET,
                        amount: BigInt(1000000000),
                        createdAt: new Date(),
                        from: {
                            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
                            chain: "IC",
                        },
                        to: {
                            address: "ryjl3-tyaaa-aaaaa-aaaba-cai",
                            chain: "IC",
                        },
                        type: INTENT_TYPE.TRANSFER,
                    },
                ],
                type: ACTION_TYPE.CLAIM_LINK,
                icrc112Requests: [],
            },
            link_user_state: LINK_USER_STATE.CHOOSE_WALLET,
        };
        return mockResponse;
        //return mapLinkUserStateModel(response);
    }

    //TODO: Mock response data, remove after BE finish implementation
    async updateLinkUserState(input: LinkUpdateUserStateInputModel) {
        const params: LinkUpdateUserStateInput = {
            link_id: input.link_id,
            action_type: input.action_type,
            goto: input.isContinue ? "Continue" : "Back",
            anonymous_wallet_address: input.anonymous_wallet_address
                ? [input.anonymous_wallet_address]
                : [],
        };
        //const response = parseResultResponse(await this.actor.link_update_user_state(params));
        //TODO: Mock response for testing
        const mockResponse: LinkGetUserStateOutputModel = {
            action: {
                id: "action_id",
                state: ACTION_STATE.SUCCESS,
                creator: "",
                intents: [],
                type: ACTION_TYPE.CLAIM_LINK,
                icrc112Requests: [],
            },
            link_user_state: LINK_USER_STATE.COMPLETE,
        };
        return mockResponse;
        //return mapLinkUserStateModel(response);
    }
}

export default LinkService;
