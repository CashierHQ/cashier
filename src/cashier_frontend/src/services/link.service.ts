import { parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/cashier_backend";
import {
    _SERVICE,
    CreateLinkInput,
    LinkDto,
    ProcessActionInput,
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

interface ReponseLinksModel {
    data: LinkModel[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadada: any;
}
export interface CreateActionInputModel {
    linkId: string;
    actionType: string;
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
                    limit: BigInt(10),
                },
            ]),
        );
        const responseModel: ReponseLinksModel = {
            data: [],
            metadada: response.metadata,
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

    async createAction(input: CreateActionInputModel): Promise<ActionModel> {
        const inputModel: ProcessActionInput = {
            action_id: "",
            link_id: input.linkId,
            action_type: input.actionType,
            params: [],
        };
        const response = parseResultResponse(await this.actor.process_action(inputModel));
        const action = mapActionModel(response);
        return action;
    }
}

export default LinkService;
