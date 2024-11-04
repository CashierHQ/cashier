import { convertNanoSecondsToDate } from "@/utils";
import {
    Action,
    AssetAirdropInfo,
    LinkDetail,
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
    linkDetailModel: LinkDetailModel,
): UpdateLinkInput => {
    const updateLinkInput: UpdateLinkInput = {
        title: linkDetailModel.title ? [linkDetailModel.title] : [],
        description: linkDetailModel.description ? [linkDetailModel.description] : [],
        image: linkDetailModel.image ? [linkDetailModel.image] : [],
        actions: [mapActions()],
        asset_info: linkDetailModel.amount ? [mapAssetInfo(linkDetailModel.amount)] : [],
        state: linkDetailModel.state ? [mapState(linkDetailModel.state)] : [],
        template: IS_USE_DEFAULT_LINK_TEMPLATE ? [LINK_TEMPLATE] : [],
    };
    return updateLinkInput;
};

// export const MapLinDetailToLinkDetailModel = (linkDetail: LinkDetail): LinkDetailModel => {
//     const result: LinkDetailModel = {
//         id: linkDetail.id,
//         title: linkDetail.title[0] ?? "",
//         description: linkDetail.description[0] ?? "",
//         image: linkDetail.image[0] ?? "",
//         link_type: linkDetail.link_type[0] ? Object.keys(linkDetail.link_type[0])[0] : "",
//         actions: linkDetail.actions ? linkDetail.actions[0] : undefined,
//         state: linkDetail.state ? Object.keys(linkDetail.state[0])[0] : undefined,
//         template: linkDetail.template ? Object.keys(linkDetail.template[0])[0] : undefined,
//         creator: linkDetail.creator ? link.creator[0] : undefined,
//         amount: linkDetail.asset_info ? linkDetail.asset_info[0].amount : undefined,
//         chain: linkDetail.asset_info ? Object.keys(linkDetail.asset_info[0].chain)[0] : undefined,
//         create_at: linkDetail.create_at
//             ? convertNanoSecondsToDate(linkDetail.create_at[0])
//             : new Date("2024-10-01"),
//         asset_info: linkDetail.asset_info ? linkDetail.asset_info[0] : null,
//     };
//     return result;
// };

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
