import { convertNanoSecondsToDate, groupLinkListByDate, parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/cashier_backend";
import {
    _SERVICE,
    CreateLinkInput,
    GetLinkResp,
    Link,
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

const parseLink = (getLinkResponse: GetLinkResp): LinkDetailModel => {
    const link: Link = getLinkResponse.link;
    return {
        id: link.id,
        title: link.title?.[0] ?? "",
        description: link.description?.[0] ?? "",
        amount: Number(link.asset_info?.[0]?.[0].amount) ?? 0,
        image: link.image?.[0] ?? "",
        link_type: link.link_type ? link.link_type[0] : undefined,
        state: link.state ? link.state[0] : undefined,
        template: link.template ? link.template[0] : undefined,
        creator: link.creator ? link.creator[0] : undefined,
        create_at: link.create_at[0]
            ? convertNanoSecondsToDate(link.create_at[0])
            : new Date("2024-10-01"),
    };
};

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
        console.log("🚀 ~ LinkService ~ getLinks ~ response:", response.data);
        let responseModel: ReponseLinksModel = {
            data: [],
            metadada: response.metadata,
        };

        responseModel.data = response.data
            ? response.data.map((link: Link) => {
                  return MapLinkToLinkDetailModel(link);
              })
            : [];
        return responseModel;
    }

    async getLink(linkId: string) {
        const response = parseResultResponse(await this.actor.get_link(linkId));
        console.log("🚀 ~ LinkService ~ getLink ~ response:", response);
        return parseLink(response);
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
