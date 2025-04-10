import { convertNanoSecondsToDate } from "@/utils";
import {
    GetLinkResp,
    LinkDetailUpdateAssetInfoInput,
    LinkDto,
    LinkGetUserStateOutput,
    UpdateLinkInput,
} from "../../../../../declarations/cashier_backend/cashier_backend.did";
import {
    AssetInfoModel,
    LinkDetailModel,
    LinkGetUserStateOutputModel,
    LinkModel,
} from "../link.service.types";
import { CHAIN, LINK_INTENT_LABEL, TEMPLATE } from "../enum";
import { fromDefinedNullable, fromNullable } from "@dfinity/utils";
import { mapActionModel } from "./action.service.mapper";

const IS_USE_DEFAULT_LINK_TEMPLATE = true;

// Map front-end 'Link' model to back-end model
export const MapLinkDetailModelToUpdateLinkInputModel = (
    linkId: string,
    linkDetailModel: LinkDetailModel,
    isContinue: boolean,
): UpdateLinkInput => {
    const updateLinkInput: UpdateLinkInput = {
        id: linkId,
        action: isContinue ? "Continue" : "Back",
        params: [
            {
                title: [linkDetailModel.title],
                asset_info: linkDetailModel.asset_info
                    ? [linkDetailModel.asset_info.map((asset) => mapAssetInfo(asset))]
                    : [],
                description: [linkDetailModel.description],
                template: IS_USE_DEFAULT_LINK_TEMPLATE ? [TEMPLATE.CENTRAL] : [],
                nft_image: [linkDetailModel.image],
                link_image_url: ["Test"],
                link_type: linkDetailModel.linkType ? [linkDetailModel.linkType] : [],
            },
        ],
    };
    return updateLinkInput;
};

export const MapLinkToLinkDetailModel = (link: LinkDto): LinkDetailModel => {
    const result = {
        id: link.id,
        title: fromNullable(link.title) ?? "",
        description: fromNullable(link.description) ?? "",
        image: "",
        linkType: fromNullable(link.link_type),
        state: link.state,
        template: fromNullable(link.template),
        creator: link.creator,
        create_at: link.create_at
            ? convertNanoSecondsToDate(link.create_at)
            : new Date("2000-10-01"),
        asset_info: fromNullable(link.asset_info)
            ? fromDefinedNullable(link.asset_info).map((asset) => ({
                  address: asset?.address,
                  amount: asset?.total_amount,
                  totalClaim: fromNullable(asset?.total_claim),
              }))
            : [],
    };
    return result;
};

// Map back-end link detail ('GetLinkResp') to Front-end model
export const MapLinkDetailModel = async (linkObj: GetLinkResp): Promise<LinkModel> => {
    const { link: linkDto, action: actionDto } = linkObj;
    return {
        action: actionDto?.length > 0 ? mapActionModel(actionDto[0]) : undefined,
        link: MapLinkToLinkDetailModel(linkDto),
    };
};

//TODO: May need to update in future, now received 'amount' as param, others are constants
const mapAssetInfo = (assetInfo: AssetInfoModel): LinkDetailUpdateAssetInfoInput => {
    return {
        address: assetInfo.address,
        chain: CHAIN.IC,
        amount_per_claim: BigInt(1),
        total_amount: assetInfo.amount,
        label: assetInfo.label ?? LINK_INTENT_LABEL.INTENT_LABEL_WALLET_TO_LINK,
    };
};

// Map back-end link user state to front-end model
export const mapLinkUserStateModel = (
    model: [LinkGetUserStateOutput] | [],
): LinkGetUserStateOutputModel => {
    return {
        action: model[0] ? mapActionModel(model[0]?.action) : undefined,
        link_user_state: model[0]?.link_user_state ?? undefined,
    };
};
