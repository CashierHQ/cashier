import {  LinkType, type CreateLinkData } from "../types";
import { Result, Ok, Err } from "ts-results-es";
import { assertUnreachable } from "$lib/rsMatch";
import type { CreateLinkInput, LinkType as BackendLinkType, LinkDetailUpdateAssetInfoInput } from "$lib/generated/cashier_backend/cashier_backend.did";
import { Principal } from "@dfinity/principal";


export const mapLinkTypeToLinkTypeBackend = (linkType: LinkType): BackendLinkType => {
   switch (linkType){
        case LinkType.TIP:
            return {'SendAirdrop' : null };
        case LinkType.AIRDROP:
            return {'SendAirdrop': null};
        case LinkType.TOKEN_BASKET:
            return {'SendTokenBasket': null};
        default:
            return assertUnreachable(linkType);
   }
}

export const mapCreateLinkDataToCreateLinkInput = (data: CreateLinkData): Result<CreateLinkInput, Error> => {

    const linkType = mapLinkTypeToLinkTypeBackend(data.linkType);

    const assetInfo:  Array<LinkDetailUpdateAssetInfoInput> = [];

    if (data.linkType === LinkType.TIP) {
        if (!data.tipLink) {
            return Err(new Error("Tip link data is missing"));
        }
        assetInfo.push({
            asset: {
                'IC': {
                    address: Principal.fromText(data.tipLink.asset)
                }
            },
            amount_per_link_use_action: BigInt(data.tipLink.amount),
            label: "SEND_TIP_ASSET"
        });
    }

    const input: CreateLinkInput = {
      title: data.title,
      asset_info: assetInfo,
      link_type: linkType,
      description: [],
      link_image_url: [],
      template: {"Central": null},
      link_use_action_max_count: 1n,
      nft_image: []
    }

    return Ok(input);


}