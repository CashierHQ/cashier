import {
    Action,
    AssetAirdropInfo,
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
            arg: "",
            method: "",
            canister_id: "",
            label: "",
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
