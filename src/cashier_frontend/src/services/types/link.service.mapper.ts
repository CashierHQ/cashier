import { convertNanoSecondsToDate } from "@/utils";
import {
    AssetInfo,
    GetLinkResp,
    Link,
    UpdateLinkInput,
} from "../../../../declarations/cashier_backend/cashier_backend.did";
import { AssetInfoModel, LinkDetailModel, LinkModel } from "./link.service.types";
import { CHAIN, TEMPLATE } from "./enum";

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
        title: nftLink.title?.[0] ?? "",
        description: nftLink.description?.[0] ?? "",
        image: nftLink.nft_image?.[0] ?? "",
        link_type: nftLink.link_type ? nftLink.link_type[0] : undefined,
        state: nftLink.state ? nftLink.state[0] : undefined,
        template: nftLink.template ? nftLink.template[0] : undefined,
        creator: nftLink.creator ? nftLink.creator[0] : undefined,
        create_at: nftLink.create_at[0]
            ? convertNanoSecondsToDate(nftLink.create_at[0])
            : new Date("2000-10-01"),
        amount: nftLink.asset_info?.[0]?.[0].total_amount
            ? Number(nftLink.asset_info?.[0]?.[0].total_amount)
            : 0,
    };
};

// Map back-end link detail ('GetLinkResp') to Front-end model
export const MapLinkDetailModel = (linkObj: GetLinkResp): LinkModel => {
    const { action_create: actionCreate, link } = linkObj;
    const nftLink = link.NftCreateAndAirdropLink;
    return {
        action_create: actionCreate ? actionCreate[0] : undefined,
        link: {
            id: nftLink.id,
            title: nftLink.title?.[0] ?? "",
            description: nftLink.description?.[0] ?? "",
            image: nftLink.nft_image?.[0] ?? "",
            link_type: nftLink.link_type ? nftLink.link_type[0] : undefined,
            state: nftLink.state ? nftLink.state[0] : undefined,
            template: nftLink.template ? nftLink.template[0] : undefined,
            creator: nftLink.creator ? nftLink.creator[0] : undefined,
            create_at: nftLink.create_at[0]
                ? convertNanoSecondsToDate(nftLink.create_at[0])
                : new Date("2000-10-01"),
            amount: nftLink.asset_info?.[0]?.[0].total_amount
                ? Number(nftLink.asset_info?.[0]?.[0].total_amount)
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
