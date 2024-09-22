import { parseResultResponse } from "@/utils";
import { createActor } from "../../../declarations/cashier_backend";
import { UpdateLinkInput } from "../../../declarations/cashier_backend/cashier_backend.did";
import { HttpAgent, Identity } from "@dfinity/agent";
import { BACKEND_CANISTER_ID } from "@/const";
import { PartialIdentity } from "@dfinity/identity";

export const LinkService = {
    getLinks: async (identity: Identity | PartialIdentity | undefined) => {
        const actor = createActor(BACKEND_CANISTER_ID, {
            agent: HttpAgent.createSync({ identity, host: "https://icp0.io" }),
        });
        const response = parseResultResponse(await actor.get_links([{
            offset: BigInt(0),
            limit: BigInt(10),
        }]));
        return response;
    },
    getLink: async (identity: Identity | PartialIdentity | undefined, linkId: string) => {
        const actor = createActor(BACKEND_CANISTER_ID, {
            agent: HttpAgent.createSync({ identity, host: "https://icp0.io" }),
        });
        const response = parseResultResponse(await actor.get_link(linkId));
        return response;
    },
    createLink: async (identity: Identity | PartialIdentity | undefined) => {
        const actor = createActor(BACKEND_CANISTER_ID, {
            agent: HttpAgent.createSync({ identity, host: "https://icp0.io" }),
        });
        const response = parseResultResponse(await actor.create_link({
            link_type: { 'NftCreateAndAirdrop': null }
        }));
        return response;
    },
    updateLink: async (identity: Identity | PartialIdentity | undefined, linkId: string, data: any) => {
        console.log("form data", data);

        const actor = createActor(BACKEND_CANISTER_ID, {
            agent: HttpAgent.createSync({ identity, host: "https://icp0.io" }),
        });
        const completeData: UpdateLinkInput = {
            title: data.title ? [data.title] : [],
            asset_info: data.asset_info ? [data.asset_info] : [],
            link_type: data.link_type ? data.link_type : [],
            description: data.description ? [data.description] : [],
            actions: data.actions ? [data.actions] : [],
            state: data.state ? [data.state] : [],
            template: data.template ? [data.template] : [],
            image: data.image ? [data.image] : [],
        };

        console.log("submit data", completeData);
        const response = parseResultResponse(await actor.update_link(linkId, completeData));
        return response;
    }
};