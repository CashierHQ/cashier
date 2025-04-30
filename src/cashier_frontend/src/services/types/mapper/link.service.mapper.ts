import { convertNanoSecondsToDate } from "@/utils";
import {
    CreateLinkInputV2,
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

export const mapDtoToLinkDetailModel = (link: LinkDto): LinkDetailModel => {
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

export const mapPartialDtoToLinkDetailModel = (link: Partial<LinkDto>): LinkDetailModel => {
    let asset_info: AssetInfoModel[] = [];
    if (link.asset_info && link.asset_info.length > 0) {
        asset_info = fromDefinedNullable(link.asset_info).map((asset) => ({
            address: asset.address,
            chain: mapStringToChain(asset.chain),
            amountPerUse: asset.amount_per_link_use_action,
            label: mapStringToLabel(asset.label),
        }));
    }

    const result: LinkDetailModel = {
        id: link.id ?? "",
        title: fromNullable(link.title ?? []) ?? "",
        description: fromNullable(link.description ?? []) ?? "",
        image: "",
        linkType: fromNullable(link.link_type ?? []),
        state: link.state,
        template: fromNullable(link.template ?? []),
        creator: link.creator,
        create_at: link.create_at
            ? convertNanoSecondsToDate(link.create_at)
            : new Date("2000-10-01"),
        asset_info: asset_info,
        maxActionNumber: link.link_use_action_max_count ?? BigInt(0),
        useActionCounter: link.link_use_action_counter ?? BigInt(0),
    };
    return result;
};

export const mapLinkDetailModelToLinkDto = (model: LinkDetailModel): LinkDto => {
    const linkDto: LinkDto = {
        id: model.id,
        state: model.state || "",
        title: model.title ? toNullable(model.title) : [],
        description: model.description ? toNullable(model.description) : [],
        link_type: model.linkType ? toNullable(model.linkType) : [],
        asset_info:
            model.asset_info && model.asset_info.length > 0
                ? toNullable(
                      model.asset_info.map((asset) => ({
                          address: asset.address,
                          chain: asset.chain || "IC",
                          label: asset.label || "",
                          amount_per_link_use_action: asset.amountPerUse,
                      })),
                  )
                : [],
        template: model.template ? toNullable(model.template) : [],
        creator: model.creator || "",
        create_at: model.create_at ? BigInt(model.create_at.getTime() * 1_000_000) : BigInt(0), // Convert Date to nanoseconds
        metadata: [],
        link_use_action_counter: model.useActionCounter || BigInt(0),
        link_use_action_max_count: model.maxActionNumber || BigInt(0),
    };

    return linkDto;
};

// Map back-end link detail ('GetLinkResp') to Front-end model
export const MapLinkDetailModel = async (linkObj: GetLinkResp): Promise<LinkModel> => {
    const { link: linkDto, action: actionDto } = linkObj;
    return {
        action: actionDto?.length > 0 ? mapActionModel(actionDto[0]) : undefined,
        link: mapDtoToLinkDetailModel(linkDto),
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

// Map from UserInputItem to LinkDetailModel
export const mapUserInputItemToLinkDetailModel = (
    model: Partial<UserInputItem>,
): LinkDetailModel => {
    const asset_info: AssetInfoModel[] =
        model.assets?.map((asset) => {
            return {
                address: asset.address,
                amountPerUse: asset.linkUseAmount,
                label: asset.label,
                chain: asset.chain,
            };
        }) || [];

    return {
        id: model.linkId || "",
        title: model.title || "",
        description: model.description || "",
        image: model.image || "",
        linkType: model.linkType || "",
        state: model.state || "",
        template: TEMPLATE.CENTRAL, // Default template
        asset_info: asset_info,
        maxActionNumber: model.maxActionNumber || BigInt(0),
        useActionCounter: BigInt(0), // Default to 0 for new links
        create_at: new Date(), // Default to current date for new links
    };
};

export const mapLinkModelToCreateLinkInputV2 = (model: LinkDetailModel): CreateLinkInputV2 => {
    // Map asset_info to LinkDetailUpdateAssetInfoInput format
    const assetInfo = model.asset_info.map((asset) => ({
        address: asset.address,
        chain: asset.chain || "IC",
        label: asset.label || "",
        amount_per_link_use_action: asset.amountPerUse,
    }));

    return {
        title: model.title,
        asset_info: assetInfo,
        link_type: model.linkType || "",
        description: model.description ? [model.description] : [],
        link_image_url: model.image ? [model.image] : [],
        template: model.template || "Central",
        link_use_action_max_count: model.maxActionNumber,
        nft_image: [],
    };
};

export const mapParitalLinkDtoToCreateLinkInputV2 = (dto: Partial<LinkDto>): CreateLinkInputV2 => {
    // Map asset_info from LinkDto to LinkDetailUpdateAssetInfoInput array
    const assetInfo =
        dto.asset_info && dto.asset_info[0]
            ? dto.asset_info[0].map((asset) => ({
                  address: asset.address,
                  chain: asset.chain,
                  label: asset.label,
                  amount_per_link_use_action: asset.amount_per_link_use_action,
              }))
            : [];

    return {
        title: dto.title ? (fromNullable(dto.title) ?? "") : "",
        asset_info: assetInfo,
        link_type: dto.link_type ? (fromNullable(dto.link_type) ?? "") : "",
        description: dto.description ? [fromNullable(dto.description) ?? ""] : [],
        link_image_url: [], // Not directly available in LinkDto
        template: dto.template ? (fromNullable(dto.template) ?? "Central") : "Central",
        link_use_action_max_count: dto.link_use_action_max_count ?? BigInt(0),
        nft_image: [], // Not directly available in LinkDto
    };
};
