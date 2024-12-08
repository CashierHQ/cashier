import { convertNanoSecondsToDate } from "@/utils";
import {
    AssetInfo,
    Link,
    UpdateLinkInput,
} from "../../../../declarations/cashier_backend/cashier_backend.did";
import { AssetInfoModel, LinkDetailModel } from "./link.service.types";
import { CHAIN, TEMPLATE } from "./enum";

const IS_USE_DEFAULT_LINK_TEMPLATE = true;

// Map front-end 'Link' model to back-end model
export const MapLinkDetailModelToUpdateLinkInputModel = (
    linkId: string,
    linkDetailModel: LinkDetailModel,
): UpdateLinkInput => {
    console.log(linkDetailModel);
    const updateLinkInput: UpdateLinkInput = {
        id: linkId,
        action: "Continue",
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

// Map back-end 'Link' to Front-end model
export const MapLinkToLinkDetailModel = (link: Link): LinkDetailModel => {
    const nftLink = link.NftCreateAndAirdropLink;
    console.log("🚀 ~ MapLinkToLinkDetailModel ~ nftLink:", nftLink);
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
