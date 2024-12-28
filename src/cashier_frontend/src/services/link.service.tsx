import { parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/cashier_backend";
import {
    _SERVICE,
    CreateIntentInput,
    CreateLinkInput,
    Link,
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
import { IntentCreateModel, CreateIntentConsentModel } from "./types/intent.service.types";
import { mapReceiveModel } from "./types/mapper/intent.service.mapper";

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
            ? response.data.map((link: Link) => {
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
            await this.actor.get_link(linkId, [
                {
                    intent_type: "Create",
                },
            ]),
        );
        return MapLinkDetailModel(response);
    }

    async createLink(input: CreateLinkInput) {
        return parseResultResponse(await this.actor.create_link(input));
    }

    async updateLink(linkId: string, data: LinkDetailModel, isContinue: boolean) {
        const completeData = MapLinkDetailModelToUpdateLinkInputModel(linkId, data, isContinue);
        const response = parseResultResponse(await this.actor.update_link(completeData));
        console.log("🚀 ~ LinkService ~ updateLink ~ response:", response);
        return response;
    }

    async validateLink(): Promise<boolean> {
        // Mock function for validation
        return false;
    }

    async createAction(
        input: CreateIntentInput,
    ): Promise<{ intent: IntentCreateModel; consent: CreateIntentConsentModel }> {
        const response = parseResultResponse(await this.actor.create_intent(input));
        return {
            intent: response.intent as IntentCreateModel,
            consent: {
                fee: response.consents.fee,
                receive: response.consents.receive.map((receive) => mapReceiveModel(receive)),
                send: response.consents.send,
            },
        };
    }
}

export default LinkService;
