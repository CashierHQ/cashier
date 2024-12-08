import { convertNanoSecondsToDate, groupLinkListByDate, parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/cashier_backend";
import {
    _SERVICE,
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
import { LinkDetailModel } from "./types/link.service.types";
import {
    MapLinkDetailModelToUpdateLinkInputModel,
    MapLinkToLinkDetailModel,
} from "./types/link.service.mapper";

interface ReponseLinksModel {
    data: LinkDetailModel[];
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
                  return MapLinkToLinkDetailModel(link);
              })
            : [];
        console.log("🚀 ~ LinkService ~ getLinks ~ responseModel:", responseModel);
        return responseModel;
    }

    async getLink(linkId: string) {
        const response = parseResultResponse(await this.actor.get_link(linkId));
        console.log("🚀 ~ LinkService ~ getLink ~ response:", response);
        return MapLinkToLinkDetailModel(response.link);
    }

    async createLink(input: CreateLinkInput) {
        return parseResultResponse(await this.actor.create_link(input));
    }

    async updateLink(linkId: string, data: LinkDetailModel) {
        const completeData = MapLinkDetailModelToUpdateLinkInputModel(linkId, data);
        console.log("🚀 ~ LinkService ~ updateLink ~ completeData:", completeData);
        const response = parseResultResponse(await this.actor.update_link(completeData));
        console.log("🚀 ~ LinkService ~ updateLink ~ response:", response);
        return response;
    }

    async validateLink(): Promise<boolean> {
        // Mock function for validation
        return false;
    }
}

export default LinkService;
