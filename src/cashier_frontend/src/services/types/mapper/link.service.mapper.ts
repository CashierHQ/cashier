import { convertNanoSecondsToDate } from "@/utils";
import {
    GetLinkResp,
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
import {
    LINK_STATE,
    LINK_TYPE,
    mapStringToChain,
    mapStringToEnum,
    mapStringToLabel,
    TEMPLATE,
} from "../enum";
import { fromDefinedNullable, fromNullable, toNullable } from "@dfinity/utils";
import { mapActionModel } from "./action.service.mapper";
import { UserInputAsset, UserInputItem } from "@/stores/linkCreationFormStore";

// Map front-end 'Link' model to back-end model
export const MapLinkDetailModelToUpdateLinkInputModel = (
    linkId: string,
    linkDetailModel: Partial<UserInputItem>,
    isContinue: boolean,
): UpdateLinkInput => {
    const updateLinkInput: UpdateLinkInput = {
        id: linkId,
        action: isContinue ? "Continue" : "Back",
        params: [
            {
                title: toNullable(linkDetailModel.title),
                asset_info: linkDetailModel.assets
                    ? toNullable(
                          linkDetailModel.assets.map((asset) => {
                              return {
                                  address: asset.address,
                                  amount_per_link_use_action: asset.linkUseAmount,
                                  chain: asset.chain,
                                  label: asset.label,
                              };
                          }),
                      )
                    : toNullable(),
                description: toNullable(linkDetailModel.description),
                template: toNullable(TEMPLATE.CENTRAL),
                nft_image: [],
                link_image_url: [],
                link_type: toNullable(linkDetailModel.linkType),
                link_use_action_max_count: toNullable(linkDetailModel.maxActionNumber),
            },
        ],
    };

    return updateLinkInput;
};

export const MapLinkToLinkDetailModel = (link: LinkDto): LinkDetailModel => {
    const result: LinkDetailModel = {
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
        asset_info:
            link.asset_info.length > 0
                ? fromDefinedNullable(link.asset_info).map((asset) => ({
                      address: asset.address,
                      chain: mapStringToChain(asset.chain),
                      amountPerUse: asset.amount_per_link_use_action,
                      label: mapStringToLabel(asset.label),
                  }))
                : [],
        maxActionNumber: link.link_use_action_max_count,
        useActionCounter: link.link_use_action_counter,
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

// Map back-end link user state to front-end model
export const mapLinkUserStateModel = (
    model: [LinkGetUserStateOutput] | [],
): LinkGetUserStateOutputModel => {
    return {
        action: model[0] ? mapActionModel(model[0]?.action) : undefined,
        link_user_state: model[0]?.link_user_state ?? undefined,
    };
};

export const mapAssetInfoModelToUserInputAsset = (model: AssetInfoModel): UserInputAsset => {
    if (!model.label) {
        throw new Error("Asset label is undefined");
    }
    if (!model.chain) {
        throw new Error("Asset chain is undefined");
    }
    return {
        address: model.address,
        linkUseAmount: model.amountPerUse,
        usdEquivalent: 0,
        usdConversionRate: 0,
        chain: model.chain,
        label: model.label,
    };
};

export const mapLinkDetailModelToUserInputItem = (model: LinkDetailModel): UserInputItem => {
    if (!model.state) {
        throw new Error("Link state is undefined");
    }

    if (!model.asset_info) {
        throw new Error("Asset info is undefined");
    }

    if (!model.linkType) {
        throw new Error("Link type is undefined");
    }

    const state = mapStringToEnum(LINK_STATE, model.state);
    const linkType = mapStringToEnum(LINK_TYPE, model.linkType);
    const assets = model.asset_info.map((asset) => {
        return mapAssetInfoModelToUserInputAsset(asset);
    });

    if (!state) {
        throw new Error("Link state is not valid");
    }

    if (!linkType) {
        throw new Error("Link type is not valid");
    }

    return {
        linkId: model.id,
        state,
        linkType,
        title: model.title,
        assets: assets,
        description: model.description,
        image: model.image,
        maxActionNumber: model.maxActionNumber,
    };
};
