import CanisterUtilsService from "@/services/canisterUtils.service";
import { LinkDetailModel } from "@/services/types/link.service.types";

export const getLinkIsClaimed = async (link: LinkDetailModel) => {
    const canisterUtils = new CanisterUtilsService();
    let linkIsClaimed = true;

    const linkId = link.id;
    const linkAssets = link.asset_info;

    for (const asset of linkAssets) {
        const balance = await canisterUtils.checkAccountBalanceWithSubAccount(
            linkId,
            asset.address,
        );
        if (balance > 0n) {
            linkIsClaimed = false;
            break;
        }
    }

    return linkIsClaimed;
};

export const getLinkAssetAmounts = async (link: LinkDetailModel) => {
    const canisterUtils = new CanisterUtilsService();
    const linkId = link.id;
    const linkAssets = link.asset_info;

    const assetAmounts: {
        address: string;
        totalAmount: bigint;
        pendingAmount: bigint;
        claimsAmount: bigint | undefined;
        assetClaimed: boolean;
    }[] = [];

    for (const asset of linkAssets) {
        const balance = await canisterUtils.checkAccountBalanceWithSubAccount(
            linkId,
            asset.address,
        );
        assetAmounts.push({
            address: asset.address,
            totalAmount: asset.amountPerClaim * link.maxActionNumber,
            pendingAmount: balance,
            claimsAmount: link.useActionCounter,
            assetClaimed: balance === 0n,
        });
    }

    return assetAmounts;
};
