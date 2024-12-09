import { convertNanoSecondsToDate, groupLinkListByDate, parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/cashier_backend";
import {
    _SERVICE,
    CreateActionInput,
    CreateLinkInput,
    GetLinkResp,
    Link,
    NftCreateAndAirdropLink,
    UpdateLinkInput,
    UpdateLinkInput as UpdateLinkInputModel,
} from "../../../declarations/cashier_backend/cashier_backend.did";
import { HttpAgent, Identity } from "@dfinity/agent";
import { BACKEND_CANISTER_ID } from "@/const";
import { PartialIdentity } from "@dfinity/identity";
import { LinkDetailModel, LinkModel } from "./types/link.service.types";
import {
    MapLinkDetailModel,
    MapLinkDetailModelToUpdateLinkInputModel,
    MapNftLinkToLinkDetailModel,
} from "./types/link.service.mapper";

interface ReponseLinksModel {
    data: LinkModel[];
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
        let responseModel: ReponseLinksModel = {
            data: [],
            metadada: response.metadata,
        };

        responseModel.data = response.data
            ? response.data.map((link: Link) => {
                  return {
                      link: MapNftLinkToLinkDetailModel(link),
                      action_create: undefined,
                  };
              })
            : [];
        return responseModel;
    }

    async getLink(linkId: string) {
        const response = parseResultResponse(await this.actor.get_link(linkId));
        console.log("🚀 ~ LinkService ~ getLink ~ response:", response);
        return MapLinkDetailModel(response);
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

    async createAction(input: CreateActionInput) {
        return parseResultResponse(await this.actor.create_action(input));
    }
}

export default LinkService;
