import { convertNanoSecondsToDate, groupLinkListByDate, parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/cashier_backend";
import {
    _SERVICE,
    CreateLinkInput,
    State,
    UpdateLinkInput as UpdateLinkInputModel,
} from "../../../declarations/cashier_backend/cashier_backend.did";
import { HttpAgent, Identity } from "@dfinity/agent";
import { BACKEND_CANISTER_ID } from "@/const";
import { PartialIdentity } from "@dfinity/identity";
import { LinkDetailModel } from "./types/link.service.types";

const parseLink = (link: any): LinkDetailModel => {
    return {
        id: link.id,
        title: link.title ? link.title[0] : undefined,
        description: link.description ? link.description[0] : undefined,
        image: link.image ? link.image[0] : undefined,
        link_type: link.link_type ? Object.keys(link.link_type[0])[0] : undefined,
        actions: link.actions ? link.actions[0] : undefined,
        state: link.state ? Object.keys(link.state[0])[0] : undefined,
        template: link.template ? Object.keys(link.template[0])[0] : undefined,
        creator: link.creator ? link.creator[0] : undefined,
        amount: link.asset_info ? link.asset_info[0].amount : undefined,
        chain: link.asset_info ? Object.keys(link.asset_info[0].chain)[0] : undefined,
        create_at: link.create_at
            ? convertNanoSecondsToDate(link.create_at[0])
            : new Date("2024-10-01"),
        asset_info: link.asset_info ? link.asset_info[0] : null,
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
        let responseModel: ReponseLinksModel = {
            data: [],
            metadada: response.metadata,
        };

        responseModel.data = response.data
            ? response.data.map((link: any) => {
                  for (const key in link) {
                      if (Array.isArray(link[key]) && link[key].length === 0) {
                          delete link[key];
                      }
                  }
                  return parseLink(link);
              })
            : [];
        return responseModel;
    }

    async getLink(linkId: string) {
        const response = parseResultResponse(await this.actor.get_link(linkId));
        return parseLink(response);
    }

    async createLink(input: CreateLinkInput) {
        return parseResultResponse(await this.actor.create_link(input));
    }

    //TODO: refactor type for this
    // TODO: apply state machine for this method or create multiple methods for each state
    async updateLink(linkId: string, data: any) {
        const completeData: UpdateLinkInputModel = {
            title: data.title ? [data.title] : [],
            asset_info: data.amount
                ? [
                      {
                          chain: {
                              IC: null,
                          },
                          amount: data.amount ?? 10,
                          address: "",
                      },
                  ]
                : [],
            description: data.description ? [data.description] : [],
            actions: [
                [
                    {
                        arg: "",
                        method: "",
                        canister_id: "",
                        label: "",
                    },
                ],
            ],
            state: data.state ? [data.state] : [],
            template: [{ Left: null }],
            image: data.image ? [data.image] : [],
        };
        console.log("called update_link with linkId =", linkId, "and data =", completeData);
        const response = parseResultResponse(await this.actor.update_link(linkId, completeData));
        return response;
    }
}

export default LinkService;
