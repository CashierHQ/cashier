import { convertNanoSecondsToDate } from "@/utils";
import {
    Action,
    AssetAirdropInfo,
    Link,
    State,
    Template,
    UpdateLinkInput,
} from "../../../../declarations/cashier_backend/cashier_backend.did";
import { AssetInfoModel, LinkDetailModel, State as StateModel } from "./link.service.types";

const IS_USE_DEFAULT_LINK_TEMPLATE = true;
// Maybe update in future, now return constant object
const LINK_TEMPLATE: Template = {
    Left: null,
};

// Map front-end 'Link' model to back-end model
export const MapLinkDetailModelToUpdateLinkInputModel = (
    linkId: string,
    linkDetailModel: LinkDetailModel,
): UpdateLinkInput => {
    const updateLinkInput: UpdateLinkInput = {
        id: linkId,
        action: "Continue",
        params: [
            {
                Update: {
                    params: [
                        {
                            title: [linkDetailModel.title],
                            asset_info: linkDetailModel.asset_info
                                ? [mapAssetInfo(linkDetailModel.asset_info)]
                                : [],
                            description: [linkDetailModel.description],
                            template: IS_USE_DEFAULT_LINK_TEMPLATE ? [LINK_TEMPLATE] : [],
                            image: [linkDetailModel.image],
                        },
                    ],
                },
            },
        ],
        // title: linkDetailModel.title ? [linkDetailModel.title] : [],
        // description: linkDetailModel.description ? [linkDetailModel.description] : [],
        // image: linkDetailModel.image ? [linkDetailModel.image] : [],
        // actions: [mapActions()],
        // asset_info: linkDetailModel.amount ? [mapAssetInfo(linkDetailModel.amount)] : [],
        // state: linkDetailModel.state ? [mapState(linkDetailModel.state)] : [],
        // template: IS_USE_DEFAULT_LINK_TEMPLATE ? [LINK_TEMPLATE] : [],
    };
    return updateLinkInput;
};

export const MapLinkToLinkDetailModel = (link: Link): LinkDetailModel => {
    return {
        id: link.id,
        title: link.title?.[0] ?? "",
        description: link.description?.[0] ?? "",
        image: link.image?.[0] ?? "",
        link_type: link.link_type ? link.link_type[0] : undefined,
        state: link.state ? link.state[0] : undefined,
        template: link.template ? link.template[0] : undefined,
        creator: link.creator ? link.creator[0] : undefined,
        create_at: link.create_at[0]
            ? convertNanoSecondsToDate(link.create_at[0])
            : new Date("2000-10-01"),
        asset_info: link.asset_info ? link.asset_info[0] : null,
    };
};

const mapState = (stateName: string): State => {
    switch (stateName) {
        case StateModel.Active:
            return {
                Active: null,
            };
        case StateModel.New:
            return {
                New: null,
            };
        case StateModel.Inactive:
            return {
                Inactive: null,
            };
        case StateModel.PendingDetail:
            return {
                PendingDetail: null,
            };
        case StateModel.PendingPreview:
            return {
                PendingPreview: null,
            };
        default:
            return {
                New: null,
            };
    }
};

// May need to update in future, now return constant object
const mapActions = (): Array<Action> => {
    return [
        {
            arg: "string",
            method: "string",
            canister_id: "string",
            label: "string",
        },
    ];
};

// May need to update in future, now received 'amount' as param, others are constants
const mapAssetInfo = (amount: number): AssetAirdropInfo => {
    const asset: AssetAirdropInfo = {
        address: "",
        amount: amount,
        chain: {
            IC: null,
        },
    };
    return asset;
};
