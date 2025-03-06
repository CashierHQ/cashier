import { parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/cashier_backend";
import {
    _SERVICE as BaseService,
    CreateLinkInput,
    LinkDto,
    ProcessActionInput,
    UpdateActionInput,
} from "../../../declarations/cashier_backend/cashier_backend.did";
import { HttpAgent, Identity } from "@dfinity/agent";
import { BACKEND_CANISTER_ID } from "@/const";
import { PartialIdentity } from "@dfinity/identity";
import { LinkDetailModel, LinkModel } from "./types/link.service.types";
import {
    MapLinkDetailModel,
    MapLinkDetailModelToUpdateLinkInputModel,
    MapLinkToLinkDetailModel,
} from "./types/mapper/link.service.mapper";
import { ActionModel } from "./types/action.service.types";
import { mapActionModel } from "./types/mapper/action.service.mapper";
import { IntentModel } from "./types/intent.service.types";
import { CHAIN, INTENT_STATE, INTENT_TYPE, TASK } from "./types/enum";

interface FeeResponse {
    id: string;
    chain: string;
    address: string;
    amount: bigint;
}

interface ExtendedService extends BaseService {
    get_fee: (linkId: string) => Promise<FeeResponse[]>;
}

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

class LinkService {
    private actor: ExtendedService;

    constructor(identity?: Identity | PartialIdentity | undefined) {
        this.actor = createActor(BACKEND_CANISTER_ID, {
            agent: HttpAgent.createSync({ identity, host: "https://icp0.io" }),
        }) as unknown as ExtendedService;
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

    async getLink(linkId: string, actionType: string) {
        const response = parseResultResponse(
            await this.actor.get_link(linkId, [
                {
                    action_type: actionType,
                },
            ]),
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
            params: [],
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

    async getFeePreview(linkId: string): Promise<IntentModel[]> {
        const response = await this.actor.get_fee(linkId);
        return response.map((fee) => ({
            id: fee.id,
            task: TASK.TRANSFER_WALLET_TO_TREASURY,
            chain: CHAIN.IC,
            state: INTENT_STATE.CREATED,
            type: INTENT_TYPE.TRANSFER_FROM,
            from: {
                chain: fee.chain,
                address: fee.address,
            },
            to: {
                chain: fee.chain,
                address: fee.address,
            },
            asset: {
                chain: fee.chain,
                address: fee.address,
            },
            amount: fee.amount,
            createdAt: new Date(),
        }));
    }
}

export default LinkService;
