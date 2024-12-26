import { convertNanoSecondsToDate } from "@/utils";
import {
    AssetInfo,
    GetLinkResp,
    Link,
    UpdateLinkInput,
} from "../../../../declarations/cashier_backend/cashier_backend.did";
import { LinkDetailModel, LinkModel } from "./link.service.types";
import { CHAIN, TEMPLATE } from "./enum";
import { fromDefinedNullable, fromNullable } from "@dfinity/utils";

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
                Update: {
                    params: [
                        {
                            title: [linkDetailModel.title],
                            asset_info: linkDetailModel.amount
                                ? [Array<AssetInfo>(mapAssetInfo(linkDetailModel))]
                                : [],
                            description: [linkDetailModel.description],
                            template: IS_USE_DEFAULT_LINK_TEMPLATE ? [TEMPLATE.CENTRAL] : [],
                            nft_image: [linkDetailModel.image],
                            link_image_url: ["Test"],
                            link_type: linkDetailModel.linkType ? [linkDetailModel.linkType] : [],
                        },
                    ],
                },
            },
        ],
    };
    return updateLinkInput;
};

export const MapLinkToLinkDetailModel = (link: Link): LinkDetailModel => {
    return {
        id: link.id,
        title: fromNullable(link.title) ?? "",
        description: fromNullable(link.description) ?? "",
        image: fromNullable(link.nft_image) ?? "",
        linkType: fromNullable(link.link_type),
        state: fromNullable(link.state),
        template: fromNullable(link.template),
        creator: fromNullable(link.creator),
        create_at: fromNullable(link.create_at)
            ? convertNanoSecondsToDate(fromDefinedNullable(link.create_at))
            : new Date("2000-10-01"),
        amount: fromNullable(link.asset_info)
            ? Number(fromDefinedNullable(link.asset_info)[0].total_amount)
            : 0,
        tokenAddress: fromNullable(link.asset_info)
            ? fromDefinedNullable(link.asset_info)[0].address
            : "",
    };
};

// Map back-end link detail ('GetLinkResp') to Front-end model
export const MapLinkDetailModel = (linkObj: GetLinkResp): LinkModel => {
    const { intent, link } = linkObj;
    return {
        intent_create: fromNullable(intent),
        link: {
            id: link.id,
            title: fromNullable(link.title) ?? "",
            description: fromNullable(link.description) ?? "",
            image: fromNullable(link.nft_image) ?? "",
            linkType: fromNullable(link.link_type),
            state: fromNullable(link.state),
            template: fromNullable(link.template),
            creator: fromNullable(link.creator),
            create_at: fromNullable(link.create_at)
                ? convertNanoSecondsToDate(fromDefinedNullable(link.create_at))
                : new Date("2000-10-01"),
            amount: fromNullable(link.asset_info)
                ? Number(fromDefinedNullable(link.asset_info)[0].total_amount)
                : 0,
            tokenAddress: fromNullable(link.asset_info)
                ? fromDefinedNullable(link.asset_info)[0].address
                : "",
        },
    };
};

const IS_TEST_LOCAL_TOKEN = true;
// May need to update in future, now received 'amount' as param, others are constants
const mapAssetInfo = (linkDetailModel: LinkDetailModel): AssetInfo => {
    return {
        address: IS_TEST_LOCAL_TOKEN ? "x5qut-viaaa-aaaar-qajda-cai" : linkDetailModel.tokenAddress,
        chain: CHAIN.IC,
        amount_per_claim: BigInt(1),
        current_amount: BigInt(linkDetailModel.amount),
        total_amount: BigInt(linkDetailModel.amount),
        total_claim: BigInt(1),
    };
};
