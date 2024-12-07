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
                            image: [linkDetailModel.image],
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

// May need to update in future, now received 'amount' as param, others are constants
const mapAssetInfo = (amount: number): AssetInfo => {
    const asset: AssetInfoModel = {
        address: "",
        amount: BigInt(amount),
        chain: CHAIN.IC,
    };
    return asset;
};
