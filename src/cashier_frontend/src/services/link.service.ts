import { parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/cashier_backend";
import {
    _SERVICE,
    CreateActionInput,
    CreateLinkInput,
    LinkDto,
} from "../../../declarations/cashier_backend/cashier_backend.did";
import { HttpAgent, Identity } from "@dfinity/agent";
import { BACKEND_CANISTER_ID } from "@/const";
import { PartialIdentity } from "@dfinity/identity";
import { LinkDetailModel, LinkModel } from "./types/link.service.types";
import {
    generateMockAction,
    MapLinkDetailModel,
    MapLinkDetailModelToUpdateLinkInputModel,
    MapLinkToLinkDetailModel,
} from "./types/mapper/link.service.mapper";
import { CreateIntentConsentModel } from "./types/intent.service.types";
import { mapReceiveModel } from "./types/mapper/intent.service.mapper";
import { ActionModel } from "./types/refractor.action.service.types";

interface ReponseLinksModel {
    data: LinkModel[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadada: any;
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

    async getLink(linkId: string) {
        const response = parseResultResponse(
            /* Do we need to pass the intent_type? */
            await this.actor.get_link(linkId, [
                // {
                //     action_type: "Create",
                // },
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

    async createAction(): Promise<ActionModel> {
        //const response = parseResultResponse(await this.actor.create_intent(input));
        return generateMockAction();
    }
}

export default LinkService;
