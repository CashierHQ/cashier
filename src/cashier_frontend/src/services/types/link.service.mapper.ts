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
                                ? [Array<AssetInfo>(mapAssetInfo(linkDetailModel.amount))]
                                : [],
                            description: [linkDetailModel.description],
                            template: IS_USE_DEFAULT_LINK_TEMPLATE ? [TEMPLATE.CENTRAL] : [],
                            nft_image: [linkDetailModel.image],
                            link_image_url: ["Test"],
                        },
                    ],
                },
            },
        ],
    };
    return updateLinkInput;
};

export const MapNftLinkToLinkDetailModel = (link: Link): LinkDetailModel => {
    const nftLink = link.NftCreateAndAirdropLink;
    return {
        id: nftLink.id,
        title: fromNullable(nftLink.title) ?? "",
        description: fromNullable(nftLink.description) ?? "",
        image: fromNullable(nftLink.nft_image) ?? "",
        link_type: fromNullable(nftLink.link_type),
        state: fromNullable(nftLink.state),
        template: fromNullable(nftLink.template),
        creator: fromNullable(nftLink.creator),
        create_at: fromNullable(nftLink.create_at)
            ? convertNanoSecondsToDate(fromDefinedNullable(nftLink.create_at))
            : new Date("2000-10-01"),
        amount: fromNullable(nftLink.asset_info)
            ? Number(fromDefinedNullable(nftLink.asset_info)[0].total_amount)
            : 0,
    };
};

// Map back-end link detail ('GetLinkResp') to Front-end model
export const MapLinkDetailModel = (linkObj: GetLinkResp): LinkModel => {
    const { intent_create: intentCreate, link } = linkObj;
    const nftLink = link.NftCreateAndAirdropLink;
    return {
        intent_create: fromNullable(intentCreate),
        link: {
            id: nftLink.id,
            title: fromNullable(nftLink.title) ?? "",
            description: fromNullable(nftLink.description) ?? "",
            image: fromNullable(nftLink.nft_image) ?? "",
            link_type: fromNullable(nftLink.link_type),
            state: fromNullable(nftLink.state),
            template: fromNullable(nftLink.template),
            creator: fromNullable(nftLink.creator),
            create_at: fromNullable(nftLink.create_at)
                ? convertNanoSecondsToDate(fromDefinedNullable(nftLink.create_at))
                : new Date("2000-10-01"),
            amount: fromNullable(nftLink.asset_info)
                ? Number(fromDefinedNullable(nftLink.asset_info)[0].total_amount)
                : 0,
        },
    };
};

// May need to update in future, now received 'amount' as param, others are constants
const mapAssetInfo = (amount: number): AssetInfo => {
    return {
        address: "",
        chain: CHAIN.IC,
        amount_per_claim: BigInt(0),
        current_amount: BigInt(amount),
        total_amount: BigInt(amount),
        total_claim: BigInt(0),
    };
};
